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

1. Clone repository

```sh
git clone https://github.com/FilenCloudDienste/filen-mobile filen-mobile
```

2. Update dependencies

```sh
cd filen-mobile && npm install && cd nodejs-assets/nodejs-project && npm install
```

3. Running a development build

```sh
cd nodejs-assets/nodejs-project/ && npm install && npm run build
npm run prebuild:clean
npm run (android:device || ios:device)
```

## License

Distributed under the AGPL-3.0 License. See [LICENSE](https://github.com/FilenCloudDienste/filen-mobile/blob/main/LICENSE.md) for more information.
