# PtvAlert Web Version

## Project Overview

PtvAlert Web is a real-time event reporting and visualization platform based on Google Maps and Firebase. Users can add reports with images and descriptions on the map, and all users can see these reports in real time. Each report is displayed as an emoji marker on the map. Clicking the marker shows details, comments, edit, or delete options. Reports automatically disappear from the map and database 3 hours after creation.

## Latest Updates

### New Location and Reporting Features
- **Direct Description Addition**:
  - New green "+ Direct Description" button for one-step reporting
  - Add reports directly without having to select a location on the map first
  - Automatic location finding based on description text
  - Markers automatically displayed as dog emoji (🐶)
  - Keyboard shortcuts (Ctrl+Enter/Cmd+Enter) for quick submission

- **Automatic Location Finding**:
  - Geocoding API implementation for finding locations from text descriptions
  - Support for location descriptions in both Chinese and English
  - Built-in database of major Melbourne locations for accurate placement
  - Fallback to predefined locations when geocoding fails
  - Prioritizes Melbourne-specific landmarks and areas

- **Enhanced Marker Information**:
  - Hover over markers to see brief report information
  - Click markers to view full report details
  - Support for displaying original description text
  - Improved marker visibility with white background and emoji indicators

- **Smart Emoji Selection**:
  - Context-aware emoji assignment based on report content
  - Keywords like "traffic" (🚗), "food" (🍔), "event" (🎪), etc. trigger specific emojis
  - Default dog emoji (🐶) for general reports

### Previous Updates
- **Advanced Language Setting Features**:
  - Language preference synchronization between login page and main page for consistent user experience
  - User language preferences are automatically saved and maintained throughout the application
  - Added multilingual support for more interface elements, including danmaku and tram information
  - Added QR code for quick access on the login page, making it convenient for mobile users
  - Optimized language switching response speed and stability
- **Login Interface Animation Enhancement**:
  - Added interesting background animation effects, including falling transit-related emoji icons
  - Implemented lively chase animation to enhance visual appeal
  - Optimized animation performance to ensure smooth operation on mobile devices
- **Danmaku System Intelligent Translation**:
  - Danmaku content now automatically translates based on the user's selected interface language
  - Supports intelligent recognition and format conversion for tram line notifications in both Chinese and English
  - Added a specialized transit terminology dictionary for accurate bidirectional translation
  - Real-time translation of user comments and report content to ensure language consistency
  - Smart conversion of special format content (such as "X号线" and "Route X")
- **Login Flow Optimization**:
  - Improved user login flow to ensure users must log in before accessing the map interface
  - Enhanced multilingual support for guest mode labels, ensuring they update automatically with language switching
  - Strengthened logout functionality to completely clear all login states
  - Optimized user menu display and interaction experience
- **Danmaku System Enhancement**:
  - Reduced danmaku movement speed for better readability (10-15 seconds to complete one movement)
  - Decreased danmaku display frequency to reduce information overload (2.5-second intervals)
  - Optimized danmaku visual styling: larger font, more prominent background, clearer text shadow
  - Increased spacing between danmaku messages to reduce overlapping and improve readability
  - Added border and shadow effects to ensure danmaku are visible against various backgrounds
- **Firebase Authentication System Optimization**:
  - Fixed Firebase authentication configuration issues
  - Removed automatic forced redirection to guest mode
  - Restored normal email/password registration and login functionality
  - Maintained guest mode as a quick access option
  - Enhanced login state verification logic to support multiple login methods
  - Improved error handling with more user-friendly error messages
  - Automatically offers guest mode as a fallback when Firebase is unavailable
  - Supports freely switching between regular login and guest mode

## Key Features
- **User Account System**
  - Email registration and login
  - Guest mode for access without registration
  - Profile management and password reset
  - Persistent login state
  - Simple and intuitive login/logout process
  - **Language Preference Memory**: The application remembers and restores user's language preference settings
- Real-time display of all user reports on the map (with emoji markers)
- Support for image upload and text description
- Comment, edit, and delete your own reports
- Reports automatically expire and disappear after 3 hours
- **Intelligent Danmaku System**:
  - Multilingual support: Danmaku content automatically switches between Chinese and English based on user interface language
  - Smart translation: Automatically recognizes and translates tram line notifications and user reports
  - Specialized dictionary: Includes Chinese-English mapping of professional terminology in the transportation field
  - Format conversion: Recognizes and converts special formats like "X号线" and "Route X"
  - Multi-track danmaku design ensuring clear message visibility
  - Adjusted danmaku speed and display frequency for better reading experience
  - Optimized danmaku visual style for enhanced readability
  - Integration with YarraTrams service updates, including publication timestamps
  - Automatic inclusion of user reports and comments in the danmaku stream
  - Multiple styles to distinguish different message types (service changes, safety alerts, user reports, etc.)
  - Automatic daily updates at midnight, with manual refresh option for latest information
- Responsive design for both mobile and desktop
- **One-click switch between English and Chinese UI**:
  - 🌐 button at the top right allows instant switching of all interface elements
  - Language settings are automatically saved and synchronized between login and main pages
  - Tram line notifications also automatically adapt their display format to match the interface language
  - Login page provides QR code scanning for quick access, convenient for mobile users

## Usage

1. **Clone or download this project**
2. **Open `login.html`** (recommended to use a local server such as VSCode Live Server, http-server, etc.)
3. **Login System**:
   - Register a new account with email
   - Login with existing account
   - Select "Continue as Guest" to use without registration
   - Or scan the QR code on the login page for quick access on mobile devices
4. **Firebase and Google Maps will initialize automatically on first load**
5. **Switch UI language anytime using the 🌐 button at the top right**; all buttons, dialogs, prompts, and danmaku will update instantly
6. **Top danmaku area** displays latest tram service information and user reports; click the "Refresh Tram Info" button in the upper right to get the latest updates

### Adding Reports
There are now two ways to add reports:

#### Method 1: Traditional Map Selection
7. **Click the "+ Add Report" button**, select a location on the map, fill in the description, upload an image, and click "Submit"
   - NEW: After entering a description, you can click "Find Location from Description" to automatically adjust the selected location based on your text
   - Alternatively, click "Use Current Location" to use your device's geolocation

#### Method 2: Direct Description (New Feature)
8. **Click the green "+ Direct Description" button** in the top right of the map
   - Enter your event description in the popup window
   - Press "Add to Map" button or use the keyboard shortcut Ctrl+Enter/Cmd+Enter
   - The system will automatically geocode your description to find a relevant location in Melbourne
   - A dog emoji marker (🐶) will be added to the map immediately
   - If your description contains keywords like "traffic", "food", "event", etc., a relevant emoji will be selected

#### Working with Markers
9. **Hover over any emoji marker** to see a brief preview of the report
10. **Click a marker** to view full details, add comments, edit, or delete (only your own reports)
11. **Reports disappear automatically after 3 hours**
12. **User menu in the top right** allows you to manage your profile or log out

### Preset Locations
The system has a built-in database of major Melbourne areas for accurate geocoding, including:
- CBD (Central Business District)
- Southbank
- St Kilda
- Carlton
- Fitzroy
- Docklands
- Melbourne University
- Flinders Street Station
- Southern Cross Station

## Dependencies
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [QRCode.js](https://github.com/davidshimjs/qrcodejs) - For generating quick access QR codes
- No backend server required; all data is synced in real time to Firebase

## Local Development & Deployment

1. **Get a Google Maps API Key**
   - Apply for and replace `YOUR_API_KEY` in the `<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY...` in `index.html`
2. **Configure Firebase**
   - Use your own Firebase project and replace the `firebaseConfig` in both `index.html` and `login.html`
   - Enable Email/Password and Anonymous authentication methods in your Firebase console
   - Detailed steps:
     1. Visit the [Firebase Console](https://console.firebase.google.com/)
     2. Create a new project or select an existing one
     3. Enable "Email/Password" sign-in method under "Build > Authentication > Sign-in method"
     4. Get your Firebase configuration object from "Settings > Project settings > Your apps > SDK setup and configuration"
     5. Copy the configuration to the `firebaseConfig` variable in both `login.html` and `index.html`
     6. Add your domain to "Authentication > Settings > Authorized domains" (add localhost for local development)
3. **Preview locally**
   - Recommended: use VSCode "Live Server" extension or `npx http-server`
   - Opening `index.html` directly in the browser may limit some features (e.g., image upload, geolocation)

## Notes
- This project is a pure front-end static implementation; all user data is publicly stored in Firebase
- Do not upload sensitive or private information/images
- For production deployment, configure your own domain, API keys, and Firebase security rules

## Contribution & Feedback
Feel free to submit issues or pull requests for suggestions or bug reports.

---

MIT License 