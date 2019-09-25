/* Functions */

// Sanitise Input
String.prototype.sanitise = function sanitise(rep = '') {
  return this.replace(/[|&;$%@"<*>()+,]/g, rep).toString();
};

// Get Numeric from Input
String.prototype.toNum = function toNum() {
  return this.replace(/[^0-9]/g, '').toString();
};

// Get Lowercase from Input
String.prototype.stringFix = function stringFix() {
  return this.toLowerCase().toString();
};

// Replace Indents in Input
String.prototype.indentFix = function indentFix(rep = '_') {
  return this.replace(/\s/g, rep).toString();
};
