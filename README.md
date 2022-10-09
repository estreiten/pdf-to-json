1. Install dependencies with `npm install`
2. Run example test with `npm start`

### Understanding the results
The first JSON level are pages, as a book is a list of pages.
Each page is an array of paragraphs.
Each paragraph itself is another array of text lines (type "text") or images (type "img").

The "height" of each one of this elements is returned.
For texts, it helps to understand the desired font-size.
For images, it helps to understand the desired image size.

The image "name" is returned by the book parser.
In order to get the image content itself, you need to invoke the "saveImg" or "getImg" operations.
The first creates the image file in the provided location, the second returns the img arrayBuffer.

#### Known issues
- Justified alignment support