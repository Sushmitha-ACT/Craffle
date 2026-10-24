const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

walk(path.join(__dirname, 'client'), (err, results) => {
  if (err) throw err;
  
  results.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Update types imports to use aliases
    content = content.replace(/from\s+['"](?:\.\.\/)+types['"]/g, "from '@shared/types'");
    content = content.replace(/from\s+['"]\.\/types['"]/g, "from '@shared/types'");
    
    // Some types are now in constants, but since we separated them, 
    // it's easier to just import them from both or fix specific categories.
    // For now, let's replace CATEGORIES imports:
    if (content.includes('CATEGORIES')) {
      content = content.replace(/import\s+\{([^}]*CATEGORIES[^}]*)\}\s+from\s+['"]@shared\/types['"]/, 
        (match, p1) => {
          let items = p1.split(',').map(s => s.trim()).filter(Boolean);
          let types = items.filter(i => i !== 'CATEGORIES');
          let res = `import { CATEGORIES } from '@shared/constants';\n`;
          if (types.length > 0) res += `import { ${types.join(', ')} } from '@shared/types';`;
          return res;
        }
      );
    }

    // App.tsx imports:
    if (file.endsWith('App.tsx')) {
      ['AdminDashboard', 'CheckoutPage', 'CustomerDashboard', 'HomePage', 'OrderTrackingPage', 'PickupPage', 'ProductDetailPage', 'SearchPage', 'SellerDashboard', 'WishlistPage'].forEach(page => {
        content = content.replace(new RegExp(`from\\s+['"]\\.\\/components\\/${page}['"]`, 'g'), `from './pages/${page}'`);
      });
      content = content.replace(/from\s+['"]\.\/components\//g, "from './components/"); // no-op but safe
    }

    // Pages importing components:
    if (file.includes(path.sep + 'pages' + path.sep)) {
      // Anything importing from '../components/' or './' might need fixing.
      // E.g. import Auth from '../components/Auth' instead of './Auth'
      // Pages used to be in components, so they imported './Auth'. Now they are in pages, so it should be '../components/Auth'.
      content = content.replace(/from\s+['"]\.\/([^'"]+)['"]/g, (match, p1) => {
        if (!p1.endsWith('Page') && !p1.endsWith('Dashboard') && p1 !== 'index.css') {
          return `from '../components/${p1}'`;
        }
        return match;
      });
    }

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  });
});
