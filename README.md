# ESP32 Camera App

## Description
This React Native application allows users to connect to an ESP32 camera, view the video stream, download video footage, and manage saved videos. It's designed to work on both iOS and Android platforms, providing a user-friendly interface for interacting with ESP32 camera modules.

## Features
- Search for ESP32 camera IP address on the local network
- View live video stream from the ESP32 camera
- Download video footage with customizable frame rate
- View and manage saved videos
- Dark mode support

## Screens
1. **Home Screen**: 
   - Search for ESP32 camera IP
   - Navigate to video stream, download, and saved videos screens

2. **Video Screen**: 
   - Display live video stream from the ESP32 camera

3. **Download Screen**: 
   - Get stream information (FPS, resolution, bitrate)
   - Download video with custom frame rate
   - View real-time FFmpeg logs during download

4. **View Videos Screen**: 
   - List all saved videos
   - Play videos using device's default video player
   - Fallback to in-app video player if needed

## Technologies Used
- React Native
- React Navigation
- WebView for video streaming
- FFmpeg for video processing and downloading
- react-native-fs for file system operations
- react-native-network-info for network operations
- react-native-file-viewer for opening videos

## Installation
(Add instructions for setting up the development environment, installing dependencies, and running the app)

## Usage
1. Launch the app and use the "Search IP" button to find your ESP32 camera on the local network.
2. Use "View Video" to see the live stream.
3. Use "Download Video" to capture and save video footage.
4. Access "Saved Videos" to view and manage your downloaded videos.

## Dependencies
- @react-navigation/native
- @react-navigation/stack
- react-native-webview
- ffmpeg-kit-react-native
- react-native-video
- react-native-network-info
- react-native-file-viewer

## Notes
- The app uses a custom method to search for the ESP32 camera on the local network.
- Video download functionality includes automatic retries on connection loss.
- The app supports both light and dark modes, adapting to the device's system theme.
