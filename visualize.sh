#!/bin/bash
rm template.drawio
rm cloudformation.png
npx @mhlabs/cfn-diagram d > cfn-diagram.log &
tail -f -n0 cfn-diagram.log | grep -qe "Press CTRL+C to exit"

if [ $? == 1 ]; then
    echo "Search terminated without finding the pattern"
fi

npx draw.io-export template.drawio -o cloudformation.png