const chai = require('chai');
const expect = chai.expect;
const should = chai.should;
const path = require("path");

const filepreview = require('../filepreview');

describe("Test to create a thumbnail from docx file with height and width with aspect ratio", () => {
    it("Should create a thumbnail fom a docx file", done => {
        const fileName = "example.docx";
        const filePath = path.resolve("test","documents", fileName);
        const options = {
            width: 200,
            height: 300,
            quality: 100,
            background: '#fff',
            pdf: true,
            keepAspect: true,
            pdf_path: path.resolve("test","pdfs")
        }
        const outPath = path.resolve ("test", "thumbnail", `${fileName.replace(/\.[^/.]+$/, "")}-widthxheight.jpg`);
        filepreview.generateAsync(filePath , outPath, options)
        .then( (response) => {
            //console.log(response);
            done();
        })
        .catch( error => done(error));
    });
});

describe("Test to create a thumbnail from docx file with height and width fixed", () => {
    it("Should create a thumbnail fom a docx file", done => {
        const fileName = "example.docx";
        const filePath = path.resolve("test","documents", fileName);
        const options = {
            width: 200,
            height: 300,
            quality: 100,
            background: '#fff',
            pdf: true,
            pdf_path: path.resolve("test","pdfs")
        }
        const outPath = path.resolve ("test", "thumbnail", `${fileName.replace(/\.[^/.]+$/, "")}-widthxheight.png`);
        filepreview.generateAsync(filePath , outPath, options)
        .then( () => done() )
        .catch( error => done(error));
    });
});

describe("Test to create a thumbnail from docx file transpatent", () => {
    it("Should create a thumbnail fom a docx file", done => {
        const fileName = "example.docx";
        const filePath = path.resolve("test","documents", fileName);
        const options = {
            width: 200,
            height: 300,
            quality: 100,
            pdf: true,
            pdf_path: path.resolve("test","pdfs")
        }
        const outPath = path.resolve ("test", "thumbnail", `${fileName.replace(/\.[^/.]+$/, "")}-transparent.png`);
        filepreview.generateAsync(filePath , outPath, options)
        .then( () => done() )
        .catch( error => done(error));
    });
});

describe("Test to create a thumbnail from docx file without height", () => {
    it("Should create a thumbnail fom a docx file", done => {
        const fileName = "example.docx";
        const filePath = path.resolve("test","documents", fileName);
        const options = {
            width: 200,
            quality: 100,
            background: '#fff',
            pdf: true,
            pdf_path: path.resolve("test","pdfs")
        }
        const outPath = path.resolve ("test", "thumbnail", `${fileName.replace(/\.[^/.]+$/, "")}-width.png`);
        filepreview.generateAsync(filePath , outPath, options)
        .then( () => done() )
        .catch( error => done(error));
    });
});

describe("Test to create a thumbnail from docx file without width", () => {
    it("Should create a thumbnail fom a docx file", done => {
        const fileName = "example.docx";
        const filePath = path.resolve("test","documents", fileName);
        const options = {
            height: 300,
            quality: 100,
            background: '#fff',
            pdf: true,
            pdf_path: path.resolve("test","pdfs")
        }
        const outPath = path.resolve ("test", "thumbnail", `${fileName.replace(/\.[^/.]+$/, "")}-height.png`);
        filepreview.generateAsync(filePath , outPath, options)
        .then( () => done() )
        .catch( error => done(error));
    });
});

describe("Test to create a thumbnail using sync method", () => {
    it("Should create a thumbnail synchronously from a docx file", done => {
        const fileName = "example-sync.docx";
        const filePath = path.resolve("test","documents", fileName);
        const options = {
            width: 200,
            height: 300,
            quality: 100,
            background: '#fff',
            pdf: true,
            pdf_path: path.resolve("test","pdfs")
        }
        const outPath = path.resolve ("test", "thumbnail", `${fileName.replace(/\.[^/.]+$/, "")}-sync.png`);
        filepreview.generateSync(filePath , outPath, options)
        .then( () => done() )
        .catch( error => done(error));
    })
});

describe("Test to create a thumbnail using sync method", () => {
    it("Should create a thumbnail synchronously from a psb adobe file", done => {
        const fileName = "ffc.psb";
        const filePath = path.resolve("test","documents", fileName);
        const options = {
            height: 300,
            quality: 100
        }
        const outPath = path.resolve ("test", "thumbnail", `${fileName.replace(/\.[^/.]+$/, "")}-sync.png`);
        filepreview.generateAsync(filePath , outPath, options)
        .then( () => done() )
        .catch( error => done(error));
    })
});

