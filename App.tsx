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
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WebView from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import 'react-native-gesture-handler';
import RNFS from 'react-native-fs';
import { FFmpegKit, FFmpegKitConfig, FFmpegSession } from 'ffmpeg-kit-react-native';
import Video from 'react-native-video';

const { width } = Dimensions.get('window'); // Get the device width
const screenWidth = Dimensions.get('window').width;

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

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [url, setUrl] = useState('');

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
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <TextInput
        style={{
          height: 40,
          width: '80%', // Adjust the width as needed
          borderColor: 'gray',
          borderWidth: 1,
          marginBottom: 12,
          color: 'black',
          fontWeight: 'bold',
          textAlign: 'center', // Center the text inside the input
        }}
        placeholder="Enter IP Address"
        placeholderTextColor="black"
        onChangeText={text => setUrl(text)}
        value={url}
      />
      <View style={{ width: '80%', marginBottom: 8 }}>
        {/* "Get Video" button with same size */}
        <TouchableOpacity
          style={{
            backgroundColor: '#007BFF',
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            height: 50, // Set consistent height
          }}
          onPress={handleGetVideo}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Get Video</Text>
        </TouchableOpacity>
      </View>

      <View style={{ width: '80%' , marginBottom: 8}}>
        {/* "Download Menu" button with same size */}
        <TouchableOpacity
          style={{
            backgroundColor: '#007BFF',
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            height: 50, // Set consistent height
          }}
          onPress={handleDownloadMenu}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Download Menu</Text>
        </TouchableOpacity>
      </View>
      <View style={{ width: '80%', marginBottom: 8 }}>
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
          <Text style={{ color: 'white', fontWeight: 'bold' }}>View Videos</Text>
        </TouchableOpacity>
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
  const [streamInfo, setStreamInfo] = useState({ averageFps: 0, resolution: '',realFPS: 0});
  const ffmpegSessionRef = useRef<FFmpegSession | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);  // Reference to the ScrollView


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
          // Step 1: Filter out the zeroes
          const nonZeroFpsValues = fpsValues.filter(fps => fps !== "0");

          // Step 2: Convert the filtered strings to numbers
          const numericFpsValues = nonZeroFpsValues.map(fps => Number(fps));

          // Step 3: Calculate the average
          const sum = numericFpsValues.reduce((acc, fps) => acc + fps, 0);
          const realFPS = parseFloat((numericFpsValues.length > 0 ? sum / numericFpsValues.length : 0).toFixed(1));
          const averageFps = Math.ceil(realFPS/2);
          setFrameRate(averageFps.toString());
          setStreamInfo({ averageFps, resolution, realFPS });
          Alert.alert('Stream Info', `FPS: ${averageFps}\nResolution: ${resolution}\n realFPS: ${realFPS}\nBitrate: ${bitrate}`);
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
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          style={{ height: 40,
              borderColor: 'gray',
              borderWidth: 1,
              flex: 1,
              color: 'black',
              fontWeight: 'bold',
              textAlign: 'center',
              width: width / 3,
              marginRight: 8
            }}
          placeholder="Frame Rate"
          placeholderTextColor="black"
          onChangeText={text => setFrameRate(text)}
          value={frameRate}
        />
        <Text style={{ marginLeft: 8, color: 'black', fontWeight: 'bold' ,width: width / 2}}>URL: {url}stream</Text>
      </View>
      <View style={{ marginTop: 20 }}>
        <Button title="Get Info" onPress={handleGetInfo} />
      </View>
      <View style={{ marginTop: 20 }}>
        <Button title="Download" onPress={handleDownload} disabled={downloading} />
      </View>
      {downloading && (
        <View style={{ marginTop: 20 }}>
          <Button title="Stop Download" onPress={handleStop} />
        </View>
      )}
      <ScrollView
        ref={scrollViewRef} // Attach the reference here
        style={{ marginTop: 20, maxHeight: 200, borderWidth: 1, borderColor: 'gray', padding: 10 }}
      >
        <Text style={{ color: 'black' }}>FFmpeg Log:</Text>
        <Text style={{ color: 'black' }}>{ffmpegLog}</Text>
      </ScrollView>
      <View style={{ marginTop: 20 }}>
        <Text style={{ color: 'black' }}>Real FPS: {streamInfo.realFPS}</Text>
        <Text style={{ color: 'black' }}>Estimated FPS: {streamInfo.averageFps}</Text>
        <Text style={{ color: 'black' }}>Resolution: {streamInfo.resolution}</Text>
      </View>
    </SafeAreaView>
  );};

  // ------------------------------------------------------------------- Video view

  const ViewVideosScreen = ({ route }: ViewVideosProps) => {

    const [videos, setVideos] = useState<string[]>([]);
    const [fallbackVideo, setFallbackVideo] = useState<string | null>(null); // For fallback video player

  
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
      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Saved Videos</Text>
        {videos.length === 0 ? (
          <Text>No videos found.</Text>
        ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                padding: 16,
                backgroundColor: '#f0f0f0',
                borderBottomWidth: 1,
                borderBottomColor: '#ccc',
                marginBottom: 10,
              }}
              onPress={() => handleOpenVideo(item)}
            >
              {/* Make sure the file name is wrapped in a Text component */}
              <Text>{item.split('/').pop()}</Text>
            </TouchableOpacity>
          )}
        />
        )}
        {/* Fallback: Play video using react-native-video if no external player is available */}
        {fallbackVideo && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ marginBottom: 10 }}>Playing in fallback player:</Text>
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
