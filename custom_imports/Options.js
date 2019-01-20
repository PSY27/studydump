module.exports = {
	signOptions: {
		issuer: 'Regex',
		audience: 'MIT',
		expiresIn:  '12h',
		algorithm: 'RS256'
	},
	thumbOptions: {
		width: 200,
		height: 200,
		quality: 100,
		keepAspect: true,
		pdf_path: "tmp/pdfs"
	}
}