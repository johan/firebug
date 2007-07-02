firebug branches/eval johnjbarton@johnjbarton.com aka johnjbarton.com@gmail.com

This is an experimental branch of Firebug implementing 
 eval() debugging, 
 event-handler debugging,
 link to issue tracker,
 fix for JavaObject bug,
 rewrite of firebug-service breakpoints,
 logging in debugger,
 linetable and executable line indications,
 debugAdapter and //@ sourceURL naming for eval(),
 misc fixes.
 
Did I mention this was experimental?
 
Known problems:
 
 Very large evals() will take much more time. UseFirstLine may fix this.
 There are a ton of if(DEBUG) statements that are culled out in the eval branch

Please report additional problems to Fireclipse project on sourceforge
 
http://sourceforge.net/tracker/?group_id=189983&atid=931513

Building:

 1) svn co https://fbug.googlecode.com/svn/branches/eval fbugEval

 2) Create fbugEval/local.properties with one line 
 update.rdf=URL-base-to-distribution-directory
 
 3) cd fbugEval; ant 
 
 4) copy dist/* to URL-base-to-distribution-directory
 
To Create branches/eval
1. copy all files from branches/explore
2. overwrite some by 
cd branches/explore
./unexplore.sh
 
 --
 This file from
 https://fbug.googlecode.com/svn/branches/eval/Readme.txt