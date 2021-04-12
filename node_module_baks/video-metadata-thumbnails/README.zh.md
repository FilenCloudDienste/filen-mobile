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

通过HTML5的Blob获取视频元数据和帧缩略图。

[English](https://github.com/wangweiwei/video-metadata-thumbnails/blob/master/README.md) | 简体中文

## **安装**

```shell
npm install --save video-metadata-thumbnails
```

or

```
yarn add video-metadata-thumbnails
```

## **使用方法**

### 通过getMetadata和getThumbnails方法

​	将 `video-metadata-thumbnails.iife.js`添加到你的`script`标签中，然后通过`Promise`的 `then`获取 元数据或者视频缩略图：

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

​	当然你可以通过`import`（或者`reqire`)`video-metadata-thumbnails` 来使用：

```javascript
import { getMetadata, getThumbnails } from 'video-metadata-thumbnails';
  
const metadata = await getMetadata(blob);
const thumbnails = await getThumbnails(blob, {
  quality: 0.6
});
console.log('Metadata: ', metadata);
console.log('Thumbnails: ', thumbnails);
```

### 通过Video对象

​	通过导入`Video`来自行初始化视频对象，然后通过`getMetadata`和`getThumbnails`获取元数据和帧缩略图：

```      javascript
import { Video } from 'video-metadata-thumbnails';

const video = new Video(blob);
console.log('Metadata:', await video.getMetadata());
console.log('Thumbnails:', await video.getThumbnails({
  quality: 0.6
}))
```

## **缩略图选项**

* quality
  * 类型: number
  * 默认值: 0.7
  * 描述: 视频缩略图的质量
* interval
  * 类型: number
  * 默认值: 1
  * 描述: 获取帧图片的时间间隔
* scale
  * 类型: number
  * 默认值: 0.7
  * 描述: 帧图片的缩放值
* start
  * 类型: number
  * 默认值: 0
  * 描述: 获取帧图片的起始帧
* end
  * 类型: number
  * 默认值: 0
  * 描述: 获取帧图片的终止帧

## **例子**

[![Example Online](https://img.shields.io/badge/-在线例子-blue?style=for-the-badge&logo=internet-explorer)](https://www.ellow.cn/examples/video-metadata-thumbnails/index.html)

## **⚠️  注意**
​	需要浏览器支持`Blob`对象

## **许可**

[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](https://github.com/wangweiwei/video-metadata-thumbnails/blob/master/LICENSE)

Copyright (c) 2020-present, Weiwei Wang 
