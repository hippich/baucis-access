## baucis-access

[![Build Status](https://travis-ci.org/hippich/baucis-access.svg)](https://travis-ci.org/hippich/baucis-access)

#### Plugin for Baucis to configure read/write access on per-attribute level.

### Installation
```bash
npm install baucis-access
```

### Testing
```bash
npm test
```

### Sample usage
```javascript
var controller = baucis.rest('vegetable');

controller.access({
    authenticated: {
        create: true,
        read: "name score"
    },
    owner: {
        write: "name species score",
        read: true
    }
});
```
