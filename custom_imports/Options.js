module.exports = {
  signOptions: {
    issuer: 'Regex',
    audience: 'MIT',
    expiresIn: '12h',
    algorithm: 'RS256'
  },
  thumbOptions: {
    width: 200,
    height: 200,
    quality: 100,
    keepAspect: true,
    pdf_path: 'tmp/pdfs'
  },
  supportedThumbs: [
    '3ds',
    '7zip',
    'ai',
    'ait',
    'asp',
    'avi',
    'bat',
    'bin',
    'bmp',
    'c',
    'cad',
    'cpp',
    'css',
    'csv',
    'dbf',
    'deb',
    'dll',
    'doc',
    'docx',
    'draw',
    'dwg',
    'dxf',
    'email',
    'eps',
    'epsf',
    'exe',
    'fla',
    'flash',
    'gif',
    'gz',
    'gzip',
    'htm',
    'html',
    'ico',
    'ini',
    'iso',
    'jar',
    'java',
    'jpe',
    'jpeg',
    'jpg',
    'js',
    'jsp',
    'line',
    'log',
    'lua',
    'm4a',
    'm4v',
    'max',
    'mkv',
    'mov',
    'mp3',
    'mp4',
    'nfo',
    'obj',
    'odg',
    'odi',
    'odp',
    'ods',
    'odt',
    'odx',
    'otf',
    'pages',
    'pdf',
    'pkg',
    'png',
    'pns',
    'pps',
    'ppt',
    'pptx',
    'ps',
    'psd',
    'python',
    'rar',
    'rtf',
    'svg',
    'svgz',
    'tif',
    'tiff',
    'ttf',
    'txt',
    'vcf',
    'wav',
    'wmv',
    'xls',
    'xlsx',
    'xml',
    'zip'
  ]
};
