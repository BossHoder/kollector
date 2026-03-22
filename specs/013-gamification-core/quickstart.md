# Quickstart: Gamification Core

Test flows for local KLECTR development.

## Setup
Install Skia/MMKV in React Native:
```bash
cd mobile/
npx expo install @shopify/react-native-skia react-native-gesture-handler react-native-reanimated react-native-mmkv
```

## Mocking State

Seed the database with an active asset eligible for testing directly into KLECTR:
```js
db.assets.updateOne(
  { _id: ObjectId("...") },
  {
    $set: {
      status: 'active',
      version: 1,
      'condition.health': 50,
      'condition.lastMaintenanceDate': null,
      visualLayers: ['dust_medium']
    }
  }
)
```

## Testing Flow (Success & Failure)

1. **Verify Asset Status Rejection**: Set `status` to `'draft'` or `'failed'` and issue a `POST /api/assets/{id}/maintain` call. Confirm `404 Not Found`.
2. **Verify Interaction**: On Expo, slide back and forth over the component mask for at least 2 continuous seconds until the visual clears `cleanedPercentage >= 80` and triggers the sync.
3. **Verify Response**: Validate the network request sent directly to `/api/assets/{id}/maintain` returns exactly:
   ```json
   {
      "previousHealth": 50,
      "newHealth": 75,
      "xpAwarded": 10,
      "streakDays": 1,
      "badgesUnlocked": ["FIRST_CLEAN"]
   }
   ```
4. **Verify Rollback (Optimistic UI)**: Disconnect the network, do the interaction, and witness celebration. When sync fails (if API is killed or modified to return `500`/`429`/`400`), verify offlineQueue immediately restores the UI to `['dust_medium']` state.
