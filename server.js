/*
* Sources on how to use pdf.js:
* - https://stackoverflow.com/questions/30733690/pdf-to-text-extractor-in-nodejs-without-os-dependencies
* - https://stackoverflow.com/questions/18680261/extract-images-from-pdf-file-with-javascript
*/
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function loadImages(page) {
  const imgOperators = [
    pdfjsLib.OPS.paintJpegXObject,
    pdfjsLib.OPS.paintImageXObject
  ]
  const operators = await page.getOperatorList();
  let imgData = []
  for (let index = 0; index < operators.fnArray.length; index++) {
    const fn = operators.fnArray[index];
    if (imgOperators.includes(fn)) {
      const arg = operators.argsArray[index]
      imgData.push({
        name: arg[0],
        height: arg[2]
      })
    }
  }
  return imgData
}

async function parsePage(path, index) {
  const doc = await pdfjsLib.getDocument(path).promise;
  let paragraphs = []
  if (index > 0 && index <= doc.numPages) {
    const page = await doc.getPage(index)
    let pageImages = await loadImages(page)
    let lastLine = {}
    const textContent = await page.getTextContent();
    for (let index2 = 0; index2 < textContent.items.length; index2++) {
      const line = textContent.items[index2];
      if ((index2 > 0 || line.str !== '/')
        && line.str.length > 0 && line.height > 0) {
          if (JSON.stringify(lastLine) === '{}') {  // first line of first paragraph
            paragraphs.push([{
              type: 'text',
              value: line.str,
              height: parseInt(line.height)
            }])
          } else {
            const separation = lastLine.top - line.transform[5]
            if (separation >= (2*line.height)) {
              // line is part of new paragraph
              if (pageImages.length > 0) {
                const img = pageImages[0]
                if (separation >= (img.height / 2)) {
                  // place image before the new paragraph
                  paragraphs[paragraphs.length-1].push({
                    type: 'img',
                    value: img.name,
                    height: parseInt(img.height)
                  })
                  pageImages.splice(0, 1)
                }
              }
              // create new paragraph with the line
              paragraphs.push([{
                type: 'text',
                value: line.str,
                height: parseInt(line.height)
              }])
            } else {  //line is part of the same paragraph
              if (separation === 0) { //same line
                paragraphs[paragraphs.length - 1].value += ` ${line.str}`
              } else {  // new line
                paragraphs[paragraphs.length - 1].push({
                  type: 'text',
                  value: line.str,
                  height: parseInt(line.height)
                })
              }
            }
          }
          lastLine = {
            top: line.transform[5],
            height: line.height
          }
        }
    }
    //append remaining images to the bottom of the page
    if (pageImages.length > 0) {
      paragraphs = paragraphs.concat(pageImages.map(image => {
        return [{
          type: 'img',
          value: image.name,
          height: parseInt(image.height)
        }]
      }))
    }
  }
  return paragraphs
}

async function parseBook(path) {
  const doc = await pdfjsLib.getDocument(path).promise;
  let book = []
  for (let index = 1; index <= doc.numPages; index++) {
    const page = await parsePage(path, index)
    book.push(page)
  }
  return book
}

function getImg (path, pageIndex, name) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = await pdfjsLib.getDocument(path).promise
      const page = await doc.getPage(pageIndex)
      await page.getOperatorList()
      page.objs.get(name, resolve)
    } catch (error) {
      reject(error)
    }
  })
}

function test() {
  const path = './Lorem Ipsum.pdf'
  parseBook(path).then(async (data) => {
    console.log('book', JSON.stringify(data, null, 2))
    // get first image (first page, second paragraph, last element)
    const secondParagraph = data[0][1]
    const imgName = secondParagraph[secondParagraph.length - 1].value
    const imgData = await getImg(path, 1, imgName)
    console.log('buffer', imgData.data.buffer)
  })
}

module.exports = {
  parsePage,
  parseBook,
  getImg,
  test
}