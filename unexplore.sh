#!/bin/bash -debug
# Run in branches/explore to remove tracing (debug output)
# requires cygwin or unix
          
echo "copy"
for i in `find ../fbugBranchesEval | sed '/\.svn/d;s/.*fbugBranchesEval//'`
do
  cp ./$i ../fbugBranchesEval/$i
  ls -l ../fbugBranchesEval/$i
done

echo "removing /*@explore*/ lines";

for i in `find . -name "*.js" | xargs grep -l "/\*@explore\*/" `
do
  sed -e '/\/\*@explore\*\//d' $i > ../fbugBranchesEval/$i;
  ls -l ../fbugBranchesEval/$i;
done
