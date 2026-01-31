# LaMetric Icon Registry for AWTRIX

Complete icon database for LaMetric smart clocks, scraped from the official API.

## Stats
- **Total Icons:** ~69,007 (as of scrape date)
- **Format:** JSON with ID → name/category mappings
- **Source:** https://developer.lametric.com/icons

## Usage

### Find by Icon Name
```javascript
const registry = require('./icons.json');
const icon = registry.byKey['fireworks'];
// { id: 2867, name: 'Fireworks', category: 'holidays', ... }
```

### Find by ID
```javascript
const icon = registry.byId[7003];
// Seahawks logo
```

### Download Icon GIF
```bash
# Format: https://developer.lametric.com/content/apps/icon_thumbs/{ID}_icon_thumb.gif
curl -O https://developer.lametric.com/content/apps/icon_thumbs/7003_icon_thumb.gif
```

## API Endpoint
```
https://developer.lametric.com/api/v1/dev/preloadicons?page=0&category=Popular&search=&count=80&guest_icons=
```

## Scraper
```bash
node scrape-lametric-full.mjs
```

## Categories
- emoji
- sport
- holidays
- games
- animals
- indicators_notifications
- cartoons_movies
- food
- environment
- logos
- social
- flags
- letters_numbers
- others

## License
Data provided for educational use. Icons are property of LaMetric.
