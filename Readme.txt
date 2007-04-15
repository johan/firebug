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
 Firefox crashes more often: I don't completely understand the rules for firebug-service
 and JSD interface.
 Very large evals() will take much more time. UseFirstLine may fix this.
 There are a ton of if(DEBUG) statements that need to be culled out for production version. 

Please report additional problems to Fireclipse project on sourceforge
 
http://sourceforge.net/tracker/?group_id=189983&atid=931513

Building:

 1) Create local.properties with one line 
 update.rdf=URL-base-to-distribution-directory
 
 2) ant 
 
 3) copy dist/* to URL-base-to-distribution-directory