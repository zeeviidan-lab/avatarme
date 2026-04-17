#!/bin/bash
source ~/avatarme-test/.env

echo "Testing Replicate API..."
echo "Running face-to-many model..."

curl -s -X POST \
  -H "Authorization: Token $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf",
    "input": {
      "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Gatto_europeo4.jpg/200px-Gatto_europeo4.jpg",
      "style": "3D",
      "prompt": "a 3D animal avatar",
      "negative_prompt": "ugly, blurry"
    }
  }' \
  https://api.replicate.com/v1/predictions
