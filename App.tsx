import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  TextInput,
  Button,
  View,
  Text,
  Alert,
  Platform,
  PermissionsAndroid,
  ScrollView,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WebView from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import 'react-native-gesture-handler';
import RNFS from 'react-native-fs';
import { FFmpegKit, FFmpegKitConfig, FFmpegSession } from 'ffmpeg-kit-react-native';

type RootStackParamList = {
  Home: undefined;
  Video: { url: string };
  Download: { url: string };
};

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type VideoScreenProps = NativeStackScreenProps<RootStackParamList, 'Video'>;
type DownloadScreenProps = NativeStackScreenProps<RootStackParamList, 'Download'>;

const Stack = createStackNavigator<RootStackParamList>();

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [url, setUrl] = useState('');

  const handleGetVideo = () => {
    navigation.navigate('Video', { url });
  };

  const handleDownloadMenu = () => {
    navigation.navigate('Download', { url });
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <TextInput
          style={{
            height: 40,
            borderColor: 'gray',
            borderWidth: 1,
            marginBottom: 12,
            color: 'black',        // Set the text color to black
            fontWeight: 'bold',    // Make the text bold
          }}
        placeholder="Enter IP Address"
        placeholderTextColor="black"
        onChangeText={text => setUrl(text)}
        value={url}
      />
      <Button
        title="Get Video"
        onPress={handleGetVideo}
      />
      <View style={{ marginVertical: 8 }} />
      <Button
        title="Download Menu"
        onPress={handleDownloadMenu}
      />
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
  const [streamInfo, setStreamInfo] = useState({ averageFps: 0, resolution: '',duration: '', bitrate: ''});
  const ffmpegSessionRef = useRef<FFmpegSession | null>(null);

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
          const averageFps = Math.ceil((numericFpsValues.length > 0 ? sum / numericFpsValues.length : 0)/2);
          setFrameRate(averageFps.toString());
          console.log('Average FPS (excluding zeroes):', averageFps);
          setStreamInfo({ averageFps, resolution, duration, bitrate });
          Alert.alert('Stream Info', `FPS: ${averageFps}\nResolution: ${resolution}\nDuration: ${duration}\nBitrate: ${bitrate}`);
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
          Alert.alert('Success', `Video downloaded successfully! File saved as ${outputFilePath}`);
        } else {
          const failStackTrace = await session.getFailStackTrace();
          console.error('FFmpeg failed with return code:', returnCode);
          if (failStackTrace) {
            console.error('FFmpeg failure stacktrace:', failStackTrace);
          }
          Alert.alert('Error', 'Failed to download video.');
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
          style={{ height: 40, borderColor: 'gray', borderWidth: 1, flex: 1, color: 'black', fontWeight: 'bold' }}
          placeholder="Enter Frame Rate"
          placeholderTextColor="black"
          onChangeText={text => setFrameRate(text)}
          value={frameRate}
        />
        <Text style={{ marginLeft: 8, color: 'black', fontWeight: 'bold' }}>URL: {url}stream</Text>
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
      <ScrollView style={{ marginTop: 20, maxHeight: 200, borderWidth: 1, borderColor: 'gray', padding: 10 }}>
        <Text style={{ color: 'black' }}>FFmpeg Log:</Text>
        <Text style={{ color: 'black' }}>{ffmpegLog}</Text>
      </ScrollView>
      <View style={{ marginTop: 20 }}>
        <Text style={{ color: 'black' }}>FPS: {streamInfo.averageFps}</Text>
        <Text style={{ color: 'black' }}>Resolution: {streamInfo.resolution}</Text>
        <Text style={{ color: 'black' }}>Duration: {streamInfo.duration}</Text>
        <Text style={{ color: 'black' }}>Bitrate: {streamInfo.bitrate}</Text>
      </View>
    </SafeAreaView>
  );};


const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Video" component={VideoScreen} />
        <Stack.Screen name="Download" component={DownloadScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
