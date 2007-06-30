#!/bin/bash -debug
# Run in branches/explore to remove tracing (debug output)
# requires cygwin or unix
          
echo "removing /*@explore*/ lines";

for i in `find . -name "*.js" | xargs grep -l "/\*@explore\*/" | xargs echo`;
do
  sed -e '/\/\*@explore\*\//d' $i > ../fbugBranchesEval/$i;
  ls -l ../fbugBranchesEval/$i;
done
