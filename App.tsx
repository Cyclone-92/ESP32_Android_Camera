import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  TextInput,
  Button,
  View,
  Text,
  Alert,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ScrollView,
  Linking,
  PermissionsAndroid,
  ActivityIndicator,
  Platform,
  useColorScheme,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WebView from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import 'react-native-gesture-handler';
import RNFS from 'react-native-fs';
import { FFmpegKit, FFmpegKitConfig, FFmpegSession } from 'ffmpeg-kit-react-native';
import Video from 'react-native-video';
import { NetworkInfo } from 'react-native-network-info'; 

const { width } = Dimensions.get('window'); // Get the device width
const screenWidth = Dimensions.get('window').width;  // Get the system theme (light or dark)

type RootStackParamList = {
  Home: undefined;
  Video: { url: string };
  Download: { url: string };
  View: undefined;
};

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type VideoScreenProps = NativeStackScreenProps<RootStackParamList, 'Video'>;
type DownloadScreenProps = NativeStackScreenProps<RootStackParamList, 'Download'>;
type ViewVideosProps = NativeStackScreenProps<RootStackParamList, 'View'>;

const Stack = createStackNavigator<RootStackParamList>();

const HomeScreen = ({ navigation }) => {
  const [url, setUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const colorScheme = useColorScheme();  // Get the system theme (light or dark)

  // Define styles for light and dark themes
  const backgroundStyle = {
    flex: 1,  // Take up the full space of the screen
    padding: 16,
    backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',  // Dark background for dark mode, light for light mode
  };

  const textColor = colorScheme === 'dark' ? '#fff' : '#000';  // Text color based on theme

  const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    );
    return Promise.race([fetch(url, options), timeoutPromise]);
  };

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const ipAddress = await NetworkInfo.getIPV4Address();

      if (!ipAddress) {
        Alert.alert('Error', 'Could not retrieve local IPv4 address');
        setIsSearching(false);
        return;
      }

      const subnet = ipAddress.split('.').slice(0, 3).join('.'); // Extract subnet
      let found = false; // found ip flag

      for (let i = 120; i < 135; i++) {
        const testIp = `${subnet}.${i}`;

        try {
          const response = await fetchWithTimeout(`http://${testIp}/`, { method: 'HEAD' }, 100);
          if (response.ok) {
            setUrl(`http://${testIp}/`);
            Alert.alert('Success', `ESP32 Camera found at IP: ${testIp}`);
            found = true;
            break;
          }
        } catch (err) {
          console.log(`Failed to fetch from ${testIp}:`, err);
        }
      }

      if (!found) {
        Alert.alert('Failed', 'ESP32 Camera not found');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not find the ESP32 Camera');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetVideo = () => {
    navigation.navigate('Video', { url });
  };

  const handleDownloadMenu = () => {
    navigation.navigate('Download', { url });
  };

  const handleViewVideos = () => {
    navigation.navigate('View'); // Navigate to the ViewVideos screen
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <TextInput
          style={{
            height: 40,
            width: '80%',
            borderColor: 'gray',
            borderWidth: 1,
            marginBottom: 12,
            color: textColor,
            fontWeight: 'bold',
            textAlign: 'center',
            backgroundColor: colorScheme === 'dark' ? '#444' : '#f0f0f0',
          }}
          placeholder="Enter IP Address"
          placeholderTextColor={colorScheme === 'dark' ? '#ccc' : '#888'}
          onChangeText={text => setUrl(text)}
          value={url}
        />

        <View style={{ width: '80%', marginBottom: 8 }}>
          {/* "Search IP" button */}
          <TouchableOpacity
            style={{
              backgroundColor: isSearching ? '#999' : '#007BFF',
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              height: 50,
              opacity: isSearching ? 0.7 : 1,  // Slight opacity when disabled
            }}
            onPress={handleSearch}
            disabled={isSearching}  // Disable the button while searching
          >
            {isSearching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Search IP</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ width: '80%', marginBottom: 8 }}>
          {/* "View Video" button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#007BFF',
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              height: 50,
            }}
            onPress={handleGetVideo}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>View Video</Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: '80%', marginBottom: 8 }}>
          {/* "Download Menu" button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#007BFF',
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              height: 50,
            }}
            onPress={handleDownloadMenu}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Download Video</Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: '80%', marginBottom: 8 }}>
          {/* "Saved Videos" button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#007BFF',
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              height: 50,
            }}
            onPress={handleViewVideos}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Saved Videos</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};


const VideoScreen = ({ route }: VideoScreenProps) => {
  const { url } = route.params;

  return (
    <WebView source={{ uri: url }} style={{ flex: 1 }} />
  );
};

// --------------------------------------------------------------
const createFolder = async () => {
  // Path to the new folder in the app's private storage
  const newFolderPath = `${RNFS.DownloadDirectoryPath}/MyNewFolder`;

  try {
    // Check if the folder already exists
    const folderExists = await RNFS.exists(newFolderPath);

    if (!folderExists) {
      // Create the folder
      await RNFS.mkdir(newFolderPath);
      console.log('Folder created successfully at:', newFolderPath);
    } else {
      console.log('Folder already exists at:', newFolderPath);
    }
  } catch (error) {
    console.error('Error creating folder:', error);
  }

  return newFolderPath
};
// -----------------------------------------------------------------------------------------------------------

const DownloadScreen = ({ route }: DownloadScreenProps) => {
  const { url } = route.params;
  const new_url = `${url}stream`;
  const [frameRate, setFrameRate] = useState('');
  const [ffmpegLog, setFfmpegLog] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [streamInfo, setStreamInfo] = useState({ averageFps: 0, resolution: '', realFPS: 0 });
  const ffmpegSessionRef = useRef<FFmpegSession | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);  // Reference to the ScrollView
  const colorScheme = useColorScheme();  // Get the system theme (light or dark)

  // Define styles for light and dark themes
  const backgroundStyle = {
    flex: 1,
    padding: 16,
    backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',  // Dark background for dark mode, light for light mode
  };

  const textColor = {
    color: colorScheme === 'dark' ? '#fff' : '#000',  // White text for dark mode, black for light mode
  };

  const generateSequentialFileName = async (folderPath: string, baseName: string, extension: string) => {
    let fileName = `${baseName}.${extension}`;
    let counter = 1;

    while (await RNFS.exists(`${folderPath}/${fileName}`)) {
      fileName = `${baseName}${counter}.${extension}`;
      counter++;
    }

    return `${folderPath}/${fileName}`;
  };

  const handleGetInfo = async () => {
    try {
      setFfmpegLog('');
      const ffmpegCommand = `-re -analyzeduration 1M -probesize 1M -i ${new_url} -t 10 -hide_banner -f null -`;
      const session = await FFmpegKit.executeAsync(ffmpegCommand, async (session) => {
        const returnCode = await session.getReturnCode();
        if (returnCode.isValueSuccess()) {
          const log = await session.getAllLogsAsString();

          const fpsMatches = [...log.matchAll(/fps=\s*(\d+)/g)];
          const fpsValues = fpsMatches.map(match => match[1]);
          const resolutionMatch = log.match(/, (\d{2,5}x\d{2,5})/);
          const durationMatch = log.match(/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/);
          const bitrateMatch = log.match(/bitrate: (\d+(\.\d+)? \w+)/);
          const fps = fpsMatches.map(match => match[1]).join(", ");
          const resolution = resolutionMatch ? resolutionMatch[1] : 'N/A';
          const duration = durationMatch ? durationMatch[1] : 'N/A';
          const bitrate = bitrateMatch ? bitrateMatch[1] : 'N/A';

          // take the average 
          const nonZeroFpsValues = fpsValues.filter(fps => fps !== "0");
          const numericFpsValues = nonZeroFpsValues.map(fps => Number(fps));
          const sum = numericFpsValues.reduce((acc, fps) => acc + fps, 0);
          const realFPS = parseFloat((numericFpsValues.length > 0 ? sum / numericFpsValues.length : 0).toFixed(1));
          const averageFps = Math.ceil(realFPS / 2);
          setFrameRate(averageFps.toString());
          setStreamInfo({ averageFps, resolution, realFPS });
          Alert.alert('Stream Info', `FPS: ${averageFps}\nResolution: ${resolution}\nReal FPS: ${realFPS}\nBitrate: ${bitrate}`);
        } else {
          Alert.alert('Error', 'Failed to retrieve stream info.');
        }
      });

      FFmpegKitConfig.enableLogCallback(log => {
        const logMessage = log.getMessage();
        setFfmpegLog(prevLog => `${prevLog}\n${logMessage}`);
      });

      ffmpegSessionRef.current = session;
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred while getting stream info.');
    }
  };

  const handleDownload = async () => {
    if (!frameRate || isNaN(Number(frameRate))) {
      Alert.alert('Invalid Input', 'Please enter a valid frame rate.');
      return;
    }

    try {
      setDownloading(true);
      setFfmpegLog('');
      const downloadFolder = `${RNFS.DownloadDirectoryPath}/DownloadedVideos`;
      if (!(await RNFS.exists(downloadFolder))) {
        await RNFS.mkdir(downloadFolder);
        Alert.alert('Success', 'Folder Created');
      }

      const outputFilePath = await generateSequentialFileName(downloadFolder, 'output', 'mp4');
      const ffmpegCommand = `-i ${new_url} -r ${frameRate} ${outputFilePath}`;

      const session = await FFmpegKit.executeAsync(ffmpegCommand, async (session) => {
        const returnCode = await session.getReturnCode();
        if (returnCode.isValueSuccess()) {
          console.log('Success', `Video downloaded successfully! File saved as ${outputFilePath}`);
        } else {
          const failStackTrace = await session.getFailStackTrace();
          console.log('FFmpeg failed with return code:', returnCode);
          if (failStackTrace) {
            console.log('FFmpeg failure stacktrace:', failStackTrace);
          }
          console.log('Error', 'Failed to download video.');
        }
        setDownloading(false);
      });

      ffmpegSessionRef.current = session;

      FFmpegKitConfig.enableLogCallback(log => {
        const logMessage = log.getMessage();
        setFfmpegLog(prevLog => `${prevLog}\n${logMessage}`);
      });

    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred while downloading the video.');
      setDownloading(false);
    }
  };

  const handleStop = () => {
    if (ffmpegSessionRef.current) {
      ffmpegSessionRef.current.cancel();
      Alert.alert('Stopped', 'FFmpeg operation has been stopped.');
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          style={{
            height: 40,
            borderColor: 'gray',
            borderWidth: 1,
            flex: 1,
            color: colorScheme === 'dark' ? '#fff' : '#000',  // Adjust text color based on theme
            fontWeight: 'bold',
            textAlign: 'center',
            width: width / 3,
            marginRight: 8,
          }}
          placeholder="Frame Rate"
          placeholderTextColor={colorScheme === 'dark' ? '#ccc' : '#888'}  // Adjust placeholder color based on theme
          onChangeText={text => setFrameRate(text)}
          value={frameRate}
        />
        <Text style={[{ marginLeft: 8, fontWeight: 'bold', width: width / 2 }, textColor]}>URL: {url}stream</Text>
      </View>
      <View style={{ marginTop: 20 }}>
        <Button title="Get Frame Rate" onPress={handleGetInfo} />
      </View>
      <View style={{ marginTop: 20 }}>
        <Button title="Download Stream" onPress={handleDownload} disabled={downloading} />
      </View>
      {downloading && (
        <View style={{ marginTop: 20 }}>
          <Button title="Stop Download" onPress={handleStop} />
        </View>
      )}
      <ScrollView
        ref={scrollViewRef}  // Attach the reference here
        style={{ marginTop: 20, maxHeight: 200, borderWidth: 1, borderColor: 'gray', padding: 10 }}
      >
        <Text style={textColor}>FFmpeg Log:</Text>
        <Text style={textColor}>{ffmpegLog}</Text>
      </ScrollView>
      <View style={{ marginTop: 20 }}>
        <Text style={textColor}>Real FPS: {streamInfo.realFPS}</Text>
        <Text style={textColor}>Estimated FPS: {streamInfo.averageFps}</Text>
        <Text style={textColor}>Resolution: {streamInfo.resolution}</Text>
      </View>
    </SafeAreaView>
  );
};


  // ------------------------------------------------------------------- Video view

  const ViewVideosScreen = ({ route }: ViewVideosProps) => {
    const [videos, setVideos] = useState<string[]>([]);
    const [fallbackVideo, setFallbackVideo] = useState<string | null>(null); // For fallback video player
  
    const colorScheme = useColorScheme();  // Detect the current system theme
  
    // Define styles for light and dark themes
    const backgroundStyle = {
      flex: 1,
      padding: 16,
      backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',  // Dark background for dark mode, light for light mode
    };
  
    const textColor = {
      color: colorScheme === 'dark' ? '#fff' : '#000',  // White text for dark mode, black for light mode
    };
  
    const videoItemStyle = {
      padding: 16,
      backgroundColor: colorScheme === 'dark' ? '#444' : '#f0f0f0',  // Adjust background color for each item based on theme
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#555' : '#ccc',  // Adjust border color for each item based on theme
      marginBottom: 10,
    };
  
    useEffect(() => {
      const fetchVideos = async () => {
        const folderPath = `${RNFS.DownloadDirectoryPath}/DownloadedVideos`;
  
        try {
          const files = await RNFS.readDir(folderPath); // Read the directory
          const videoFiles = files
            .filter(file => file.isFile() && file.name.endsWith('.mp4')) // Filter .mp4 files
            .map(file => file.path);
          setVideos(videoFiles);
        } catch (error) {
          console.error('Error reading directory:', error);
          Alert.alert('Error', 'Failed to load videos.');
        }
      };
  
      fetchVideos();
    }, []);
  
    const handleOpenVideo = async (videoPath: string) => {
      try {
        const supported = await Linking.canOpenURL(`file://${videoPath}`);
        if (supported) {
          await Linking.openURL(`file://${videoPath}`); // Opens the video in an external player
        } else {
          setFallbackVideo(videoPath);
        }
      } catch (error) {
        console.error('Error opening video:', error);
        Alert.alert('Error', 'Failed to open the video.');
      }
    };
  
    return (
      <SafeAreaView style={backgroundStyle}>
        <Text style={[{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }, textColor]}>
          Saved Videos
        </Text>
  
        {videos.length === 0 ? (
          <Text style={textColor}>No videos found.</Text>
        ) : (
          <FlatList
            data={videos}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={videoItemStyle}
                onPress={() => handleOpenVideo(item)}
              >
                <Text style={textColor}>{item.split('/').pop()}</Text> {/* Display the file name */}
              </TouchableOpacity>
            )}
          />
        )}
  
        {/* Fallback: Play video using react-native-video if no external player is available */}
        {fallbackVideo && (
          <View style={{ marginTop: 20 }}>
            <Text style={[{ marginBottom: 10 }, textColor]}>Playing in fallback player:</Text>
            <Video
              source={{ uri: `file://${fallbackVideo}` }}
              style={{ width: screenWidth, height: 300 }}
              controls={true}  // Enable controls like play, pause, seek, etc.
              onEnd={() => setFallbackVideo(null)} // Close the fallback player when the video ends
            />
          </View>
        )}
      </SafeAreaView>
    );
  };  



const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Video" component={VideoScreen} />
        <Stack.Screen name="Download" component={DownloadScreen} />
        <Stack.Screen name="View" component={ViewVideosScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
