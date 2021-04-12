<p align="center">
  <a href="https://www.ellow.cn/examples/video-metadata-thumbnails/index.html" target="_blank">
    <img width="160" src="https://raw.githubusercontent.com/wangweiwei/video-metadata-thumbnails/master/examples/video.png" alt="logo">
  </a>
</p>

<h2 align="center">Video Metadata & Thumbnails</h2>

<p align="center">
  <a href="https://npmjs.com/package/video-metadata-thumbnails" rel="nofollow">
    <img alt="Latest Version on NPM" src="https://img.shields.io/npm/v/video-metadata-thumbnails" style="max-width:100%;">
  </a>
  <a href="https://github.com/wangweiwei/video-metadata-thumbnails/issues">
    <img alt="Issue" src="https://img.shields.io/badge/-help--wanted-brightgreen" style="max-width:100%;">
  </a>
  <a href="https://github.com/wangweiwei/video-metadata-thumbnails/blob/master/LICENSE">
    <img alt="Software License" src="https://img.shields.io/npm/l/video-metadata-thumbnails" style="max-width:100%;">
  </a>
  <a href="https://github.com/wangweiwei/video-metadata-thumbnails">
    <img alt="Contributors Anon" src="https://img.shields.io/github/contributors-anon/wangweiwei/video-metadata-thumbnails" style="max-width:100%;">
  </a>
  <a href="https://github.com/wangweiwei/video-metadata-thumbnails">
    <img alt="Code Size" src="https://img.shields.io/github/languages/code-size/wangweiwei/video-metadata-thumbnails" style="max-width:100%;">
  </a>
  <a href="https://github.com/wangweiwei/video-metadata-thumbnails">
    <img alt="Languages Count" src="https://img.shields.io/github/languages/count/wangweiwei/video-metadata-thumbnails" style="max-width:100%;">
  </a>
  <br/>
  <a href="https://npmjs.com/package/video-metadata-thumbnails" >
    <img alt="Downloads" src="https://img.shields.io/npm/dt/video-metadata-thumbnails.svg" style="max-width:100%;">
  </a>
  <a href="https://github.com/wangweiwei/video-metadata-thumbnails">
    <img alt="Languages" src="https://img.shields.io/github/languages/top/wangweiwei/video-metadata-thumbnails" style="max-width:100%;">
  </a>
  <a href="https://www.ellow.cn/examples/video-metadata-thumbnails/index.html" rel="nofollow">
    <img alt="Examle Online" src="https://img.shields.io/badge/-Example--Online-blue" style="max-width:100%;">
  </a>
</p>

Convenience method(or Video object) to get metadata and thumbnails of HTML5 video Blob.

English | [简体中文](https://github.com/wangweiwei/video-metadata-thumbnails/blob/master/README.zh.md)

## **Installation**

```shell
npm install --save video-metadata-thumbnails
```

or

```
yarn add video-metadata-thumbnails
```

## **Usage**

### getMetadata method &  getThumbnails method

​	Add `video-metadata-thumbnails.iife.js` to your document and get the metadata or thumbnails value of the promise returned by `then`:

```html
<input type="file" onchange="onChange(this.files)" />
<script src="https://cdn.jsdelivr.net/npm/video-metadata-thumbnails/lib/video-metadata-thumbnails.iife.js"></script>
<script>
function onChange(files) {
  __video_metadata_thumbnails__.getMetadata(files[0]).then(function(metadata) {
    console.log('Metadata: ', metadata);
  })
  __video_metadata_thumbnails__.getThumbnails(files[0]).then(function(thumbnails) {
    console.log('Thumbnails: ', thumbnails);
  })
}
</script>
```

​	Alternatively, you can import(or require) `video-metadata-thumbnails` by getting it from `npm` :

```javascript
import { getMetadata, getThumbnails } from 'video-metadata-thumbnails';
  
const metadata = await getMetadata(blob);
const thumbnails = await getThumbnails(blob, {
  quality: 0.6
});
console.log('Metadata: ', metadata);
console.log('Thumbnails: ', thumbnails);
```
### Video Object

​	Import(or require) `video-metadata-thumbnails` by getting it from `npm`

```      javascript
import { Video } from 'video-metadata-thumbnails';

const video = new Video(blob);
console.log('Metadata:', await video.getMetadata());
console.log('Thumbnails:', await video.getThumbnails({
  quality: 0.6
}))
```

## **Thumbnails' Options**

* quality
  * type: number
  * default: 0.7
  * description: video thumbnails' quality
* interval
  * type: number
  * default: 1
  * description: time interval
* scale
  * type: number
  * default: 0.7
  * description: video thumbnails' scale
* start
  * type: number
  * default: 0
  * description: start frame
* end
  * type: number
  * default: 0
  * description: the end of frame

## **Example**

[![Example Online](https://img.shields.io/badge/-Example--Online-blue?style=for-the-badge&logo=internet-explorer)](https://www.ellow.cn/examples/video-metadata-thumbnails/index.html)

## **⚠️  Notice**

​	`Blob` object is required in browser.


## **License**
[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](https://github.com/wangweiwei/video-metadata-thumbnails/blob/master/LICENSE)

Copyright (c) 2020-present, Weiwei Wang 
