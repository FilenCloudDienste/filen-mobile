<br/>
<p align="center">
  <h3 align="center">Filen Mobile</h3>

  <p align="center">
    Mobile app for iOS and Android.
    <br/>
    <br/>
  </p>
</p>

![Contributors](https://img.shields.io/github/contributors/FilenCloudDienste/filen-mobile?color=dark-green) ![Forks](https://img.shields.io/github/forks/FilenCloudDienste/filen-mobile?style=social) ![Stargazers](https://img.shields.io/github/stars/FilenCloudDienste/filen-mobile?style=social) ![Issues](https://img.shields.io/github/issues/FilenCloudDienste/filen-mobile) ![License](https://img.shields.io/github/license/FilenCloudDienste/filen-mobile)

### Installation and building


#### Rust

1. [Install Rust](https://www.rust-lang.org/tools/install)

2. Install Cargo NDK

```
cargo install cargo-ndk
```

3. Install targets

```
rustup target add aarch64-linux-android
rustup target add aarch64-apple-ios
rustup target add aarch64-apple-ios-sim
rustup target add x86_64-linux-android
```

#### Android

1. Install OpenJDK 17

eg on MacOS using Homebrew

```bash
brew install openjdk@17
```

2. Set `JAVA_HOME` to new java home

e.g. on MacOS using homebrew

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
```

verify with

```bash
java -version
javac -version
echo $JAVA_HOME
```

#### Expo

1. Use Node.js version 24+

2. Set up your environment for expo Development for [iOS](https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=simulated&mode=development-build&buildEnv=local) and [android](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=simulated&mode=development-build&buildEnv=local)

3. Clone repository

```bash
git clone --recursive https://github.com/FilenCloudDienste/filen-mobile filen-mobile
```

4. Update dependencies

```bash
cd filen-mobile && npm install --force && cd nodejs-assets/nodejs-project && npm install --force && cd .. && cd ..
```

5. Running a development build

```bash
npm run buildNodeThread
npm run prebuild:clean
npm run ios:device
npm run android:device
```

## License

Distributed under the AGPL-3.0 License. See [LICENSE](https://github.com/FilenCloudDienste/filen-mobile/blob/master/LICENSE) for more information.
