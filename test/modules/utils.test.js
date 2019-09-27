/* Legacy Modules */
const should = require('should');


/* Import Utils */
const { getFileName } = require('../../utils/MetaManip');
const { checkReturn } = require('../../utils/NullUndef');
require('../../utils/StringExtensions');


/* Unit Tests */

// Meta Manipulation
describe('\n\t#getFileName Module', () => {
  it('Availability', () => {
    should(getFileName).be.a.function;
  });

  it('Empty parameter', () => {
    should(getFileName()).be.undefined;
  });

  it('Non-string parameter', () => {
    var notstr;
    should(getFileName(notstr)).be.undefined;
  });

  it('Valid string parameter', () => {
    var instr = 'https://sample-bucket.s3.sample-region.amazonaws.com/nested/folder/heirarchy/Upload-Document_With(Many)[Characters]]]$$And!Special-Characters-1566145764091Timestamp.pdf';
    var expstr = 'Upload-Document_With(Many)[Characters]]]$$And!Special-Characters.pdf';
    should(getFileName(instr)).be.ok();
    should(getFileName(instr)).equal(expstr);
  });
});

// Null Undefined
describe('\n\t#checkReturn Module', () => {
  it('Availability', () => {
    should(checkReturn).be.a.function;
  });

  context('\n\t  Feed defined', () => {
    var feed = Object();

    it('With alternative', () => {
      var alt = Object();
      should(checkReturn(feed, alt)).equals(feed);
    });

    it('Without alternative', () => {
      should(checkReturn(feed)).equals(feed);
    });
  });

  context('\n\t  Feed undefined', () => {
    it('With alternative', () => {
      var alt = Object();
      should(checkReturn(undefined, alt)).equals(alt);
    });

    it('Without alternative', () => {
      should(checkReturn()).equals(null);
    });
  });
});

// String Extensions
describe('\n\t#string Module', () => {
  it('Sanitise', () => {
    should('<W7U&GT8ZD1RQtxo(NGF6qFfsF0>fGn["Dmxq|3FqJ]0PO8*p6CRClm%DY]WdT$zg,<yXP(g;*'.sanitise()).equals('W7UGT8ZD1RQtxoNGF6qFfsF0fGn[Dmxq3FqJ]0PO8p6CRClmDY]WdTzgyXPg');
  });

  it('To Number', () => {
    should('<W7U&GT8ZD1RQtxo(NGF6qFfsF0>fGn["Dmxq|3FqJ]0PO8*p6CRClm%DY]WdT$zg,<yXP(g;*'.toNum()).equals('781603086');
  });

  it('Lowercase', () => {
    should('<W7U&GT8ZD1RQtxo(NGF6qFfsF0>fGn["Dmxq|3FqJ]0PO8*p6CRClm%DY]WdT$zg,<yXP(g;*'.stringFix()).equals('<w7u&gt8zd1rqtxo(ngf6qffsf0>fgn["dmxq|3fqj]0po8*p6crclm%dy]wdt$zg,<yxp(g;*');
  });

  it('Indentation', () => {
    should('DKaZv ;krbusKD8%qKlrd41<QX3)2x;lL> Q$0A6uaAvJq)m>r|Y TyWnX+QtZ5huwnOKYNkQ12'.indentFix()).equals('DKaZv_;krbusKD8%qKlrd41<QX3)2x;lL>_Q$0A6uaAvJq)m>r|Y_TyWnX+QtZ5huwnOKYNkQ12');
  });
});
