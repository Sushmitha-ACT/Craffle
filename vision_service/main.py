"""
Craffle Computer-Vision Microservice
Pretrained MobileNetV2 Visual Feature Embedding Engine
"""

import io
import time
import urllib.request
from typing import List, Optional
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize Keras MobileNetV2
import keras
from keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input

app = FastAPI(
    title="Craffle Visual Search Service",
    version="1.0.0",
    description="Pretrained Visual Embedding Engine for Craffle Marketplace Camera Search"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME = "MobileNetV2"
MODEL_VERSION = "mobilenet-v2-imagenet-v1"
EMBEDDING_DIM = 1280
TARGET_SIZE = (224, 224)

# Global model instance
model: Optional[MobileNetV2] = None

@app.on_event("startup")
def load_vision_model():
    global model
    print(f"[VisionService] Loading pretrained {MODEL_NAME} model (ImageNet weights)...")
    start = time.time()
    model = MobileNetV2(weights="imagenet", include_top=False, pooling="avg")
    # Warmup prediction with dummy input
    dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
    model.predict(dummy, verbose=0)
    print(f"[VisionService] Model loaded and warmed up in {time.time() - start:.2f}s")

def extract_features_from_pil(pil_img: Image.Image) -> List[float]:
    """Preprocess PIL image and extract normalized 1280-d visual feature vector."""
    if pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")
    
    # High-quality bicubic resize
    pil_img = pil_img.resize(TARGET_SIZE, Image.Resampling.BICUBIC)
    
    arr = np.array(pil_img, dtype=np.float32)
    arr = np.expand_dims(arr, axis=0)
    arr = preprocess_input(arr)
    
    vec = model.predict(arr, verbose=0)[0]
    
    # L2 normalize
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
        
    return vec.tolist()

class UrlEmbedRequest(BaseModel):
    url: str

class EmbedResponse(BaseModel):
    embedding: List[float]
    dimensions: int
    modelVersion: str
    inferenceTimeMs: float

class HealthResponse(BaseModel):
    status: str
    model: str
    version: str
    dimensions: int
    ready: bool

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="healthy",
        model=MODEL_NAME,
        version=MODEL_VERSION,
        dimensions=EMBEDDING_DIM,
        ready=model is not None
    )

@app.post("/embed", response_model=EmbedResponse)
async def embed_image(file: UploadFile = File(...)):
    """Generate normalized visual embedding from an uploaded image file."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image")
    
    try:
        start_time = time.time()
        contents = await file.read()
        if len(contents) > 8 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size exceeds 8MB limit")
            
        pil_img = Image.open(io.BytesIO(contents))
        embedding = extract_features_from_pil(pil_img)
        elapsed = (time.time() - start_time) * 1000.0
        
        return EmbedResponse(
            embedding=embedding,
            dimensions=EMBEDDING_DIM,
            modelVersion=MODEL_VERSION,
            inferenceTimeMs=round(elapsed, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Image decoding failed: {str(e)}")

@app.post("/embed-url", response_model=EmbedResponse)
async def embed_image_url(req: UrlEmbedRequest):
    """Generate visual embedding from an image URL (e.g. catalog image)."""
    try:
        start_time = time.time()
        headers = {"User-Agent": "Craffle-VisualSearch/1.0"}
        request = urllib.request.Request(req.url, headers=headers)
        
        with urllib.request.urlopen(request, timeout=10) as response:
            image_data = response.read()
            
        pil_img = Image.open(io.BytesIO(image_data))
        embedding = extract_features_from_pil(pil_img)
        elapsed = (time.time() - start_time) * 1000.0
        
        return EmbedResponse(
            embedding=embedding,
            dimensions=EMBEDDING_DIM,
            modelVersion=MODEL_VERSION,
            inferenceTimeMs=round(elapsed, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch and embed image URL: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5001, log_level="info")
