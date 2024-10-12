# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
# Keep classes related to react-native-network-info
-keep class com.pusherman.networkinfo.** { *; }

# Keep all native modules
-keep class com.facebook.react.** { *; }

# Keep React Native-related methods and classes
-keep class com.facebook.** { *; }
