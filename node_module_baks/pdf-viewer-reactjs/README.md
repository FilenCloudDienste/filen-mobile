# pdf-viewer-reactjs

![npm](https://img.shields.io/npm/v/pdf-viewer-reactjs) ![npm](https://img.shields.io/npm/dw/pdf-viewer-reactjs) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/pdf-viewer-reactjs) ![NPM](https://img.shields.io/npm/l/pdf-viewer-reactjs)

Simple react PDF Viewer component with controls like

-   Page navigation

-   Zoom

-   Rotation

Every element can be styled upon your preferences using default classes your own and also custom react element can be passed.

it is originally forked from [mgr-pdf-viewer-react](https://github.com/MGrin/mgr-pdf-viewer-react)

### Example: Live demo is available [here](https://ansu5555.github.io/pdf-viewer-reactjs/)

# How to install

```

npm install pdf-viewer-reactjs

```

# Note:

> ### Due to causing [broken css issue](https://github.com/ansu5555/pdf-viewer-reactjs/issues/27) **_bulma_**, **_bulma-helpers_** & **_material-design-icons_** are removed from dependencies and added as peerDependencies

>

> ### Please install **_bulma_**, **_bulma-helpers_** & **_material-design-icons_** from npm by yourself or provide custom css as per your requirement

# How to use

```js
import React from 'react'

import PDFViewer from 'pdf-viewer-reactjs'

const ExamplePDFViewer = () => {
    return (
        <PDFViewer
            document={{
                url: 'https://arxiv.org/pdf/quant-ph/0410100.pdf',
            }}
        />
    )
}

export default ExamplePDFViewer
```

# Documentation

React component prop. types:

-   `document`:

*   Type:

```js
PropTypes.shape({
    url: String, // URL to the pdf

    base64: String, // PDF file encoded in base64
})
```

-   Required: **true**

-   Description: Provides a way to fetch the PDF document

*   `password`:

-   Type: _String_

-   Required: **false**

-   Description: For decrypting password-protected PDFs

*   `withCredentials`:

-   Type: _Boolean_

-   Required: **false**

-   Description: Indicates whether or not cross-site Access-Control requests should be made using credentials such as cookies or authorization headers. The default is false

*   `page`:

-   Type: _Number_

-   Required: **false**

-   Description: The page that will be shown first on document load

*   `scale`:

-   Type: _Number_

-   Required: **false**

-   Description: Scale factor relative to the component parent element

*   `scaleStep`:

-   Type: _Number_

-   Required: **false**

-   Description: Scale factor to be increased or decreased on Zoom-in or zoom-out

*   `maxScale`:

-   Type: _Number_

-   Required: **false**

-   Description: Maximun scale factor for zoom-in

*   `minScale`:

-   Type: _Number_

-   Required: **false**

-   Description: Minimum scale factor for zoom-out

*   `rotationAngle`:

-   Type: _Number_

-   Required: **false**

-   Description: Initial rotation of the document, values can be -90, 0 or 90

*   `onDocumentClick`:

-   Type: _Function_

-   Required: **false**

-   Description: A function that will be called only on clicking the PDF page itself, NOT on the navbar

*   `onPrevBtnClick`:

-   Type: _Function_

-   Required: **false**

-   Description: A function that will be called on clicking on the previous page button, page number can be accessed in the function.

*   `onNextBtnClick`:

-   Type: _Function_

-   Required: **false**

-   Description: A function that will be called on clicking on the next page button, page number can be accessed in the function.

*   `onZoom`:

-   Type: _Function_

-   Required: **false**

-   Description: A function that will be called on clicking on Zoom controls, zoom scale can be accessed in the function.

*   `onRotation`:

-   Type: _Function_

-   Required: **false**

-   Description: A function that will be called on clicking on Rotation controls, rotation angle can be accessed in the function.

*   `getMaxPageCount`:

-   Type: _Function_

-   Required: **false**

-   Description: A function that will be called on clicking on document load, total page count can be accessed in the function.

*   `css`:

-   Type: _String_

-   Required: **false**

-   Description: CSS classes that will be setted for the component wrapper

*   `canvasCss`:

-   Type: _String_

-   Required: **false**

-   Description: CSS classes that will be setted for the PDF page

*   `hideNavbar`:

-   Type: _Boolean_

-   Required: **false**

-   Description: By default navbar is displayed, but can be hidden by passing this prop

*   `navbarOnTop`:

-   Type: _Boolean_

-   Required: **false**

-   Description: By default navbar is displayed on bottom, but can be placed on top by passing this prop

*   `hideZoom`:

-   Type: _Boolean_

-   Required: **false**

-   Description: By default zoom buttons are displayed, but can be hidden by passing this prop

*   `hideRotation`:

-   Type: _Boolean_

-   Required: **false**

-   Description: By default rotation buttons are displayed, but can be hidden by passing this prop

*   `loader`:

-   Type: _Node_

-   Required: **false**

-   Description: A custom loader element that will be shown while the PDF is loading

*   `alert`:

-   Type: _Node_

-   Required: **false**

-   Description: A custom alerf element that will be shown on error

*   `showThumbnail`:

-   Type:

```js
PropTypes.shape({
    scale: PropTypes.number, // Thumbnail scale, ranges from 1 to 5

    rotationAngle: PropTypes.number, // Thumbnail rotation angle, values can be -90, 0 or 90. Default is 0
})
```

-   Required: **false**

-   Description: Details of the thumbnails, not shown if not provided

*   `protectContent`:

-   Type: _Boolean_

-   Required: **false**

-   Description: By default Right Click and Context Menu are enabled, but can be disabled by passing this prop

*   `watermark`:

-   Type:

```js
PropTypes.shape({
    text: PropTypes.string, // Watermark text

    diagonal: PropTypes.bool, // Watermark placement true for Diagonal, false for Horizontal

    opacity: PropTypes.string, // Watermark opacity, ranges from 0 to 1

    font: PropTypes.string, // custom font name default is 'Comic Sans MS'

    size: PropTypes.string, // Fontsize of Watermark

    color: PropTypes.string, // Color(hexcode) of the watermark
})
```

-   Required: **false**

-   Description: Details of the watermark, not shown if not provided

*   `navigation`:

-   Type:

```js

PropTypes.oneOfType([

// Can be an object with css classes or react elements to be rendered

PropTypes.shape({

css:  PropTypes.shape({

navbarWrapper:  String, // CSS Class for the Navbar Wrapper

zoomOutBtn:  String, // CSS Class for the ZoomOut Button

resetZoomBtn:  String, // CSS Class for the Reset Zoom Button

zoomInBtn:  String, // CSS Class for the ZoomIn Button

previousPageBtn:  String, // CSS Class for the PreviousPage button

pageIndicator:  String, // CSS Class for the Page Indicator

nextPageBtn:  String, // CSS Class for the NextPage button

rotateLeftBtn:  String, // CSS Class for the RotateLeft button

resetRotationBtn:  String, // CSS Class for the Reset Rotation button

rotateRightBtn:  String  // CSS Class for the RotateRight button

})

// Or a full navigation component

PropTypes.any  // Full navigation React element

]);

```

-   Required: **false**

-   Description: Defines the navigation bar styles and/or elements.

# Author

![Image of Author](https://avatars3.githubusercontent.com/u/5373653?s=150)

### Ansuman Ghosh

[ansu5555.com](https://www.ansu5555.com/)
