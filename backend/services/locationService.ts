export const locationService = {
  /**
   * Calculates the Haversine distance between two sets of coordinates in kilometers.
   * @param lat1 User Latitude
   * @param lon1 User Longitude
   * @param lat2 Seller/Product Latitude
   * @param lon2 Seller/Product Longitude
   * @returns Distance in km (rounded to 1 decimal place) or undefined if invalid input.
   */
  calculateDistance: (lat1?: number, lon1?: number, lat2?: number, lon2?: number): number | undefined => {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined || isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return undefined;
    }

    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return parseFloat(distance.toFixed(1));
  }
};
