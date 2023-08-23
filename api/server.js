  const express = require('express')
  const multer = require('multer')  // dealing with the uploaded file
  const cors = require('cors');    // cross-origin request
  const axios = require('axios')  // communicating with starton
  const app = express()
  const port=process.env.PORT || 5000
  
  app.use(express.json())
  
  const upload = multer({
      limits:{
          fileSize:1000000
      }
  })
  
  const starton = axios.create({
      baseURL: "https://api.starton.io/v3",
      headers: {
          "x-api-key": "sk_live_dd49df13-879d-4f85-81fa-a90881bb4b54",
      },
    })
  
    app.post('/upload',cors(),upload.single('file'),async(req,res)=>{
     
      let data = new FormData();
      const blob = new Blob([req.file.buffer],{type:req.file.mimetype});
      data.append("file",blob,{filename:req.file.originalnam})
      data.append("isSync","true");
  
      async function uploadImageOnIpfs(){
          const ipfsImg = await starton.post("/ipfs/file", data, {
              headers: { "Content-Type": `multipart/form-data; boundary=${data._boundary}` },
            })
            return ipfsImg.data;
      }
      async function uploadMetadataOnIpfs(imgCid){
          const metadataJson = {
              name: `A Wonderful NFT`,
              description: `Probably the most awesome NFT ever created !`,
              image: `ipfs://ipfs/${imgCid}`,
          }
          const ipfsMetadata = await starton.post("/ipfs/json", {
              name: "My NFT metadata Json",
              content: metadataJson,
              isSync: true,
          })
          return ipfsMetadata.data;
      }
      
      const SMART_CONTRACT_NETWORK="polygon-mumbai"
      const SMART_CONTRACT_ADDRESS="0xE88804029DD8DbABE5c46eD57cC4721E97917417"
      const WALLET_IMPORTED_ON_STARTON="0xfE17898b5715aA16Dbb3C5591692D06e7a141BB5";
      async function mintNFT(receiverAddress,metadataCid){
          const nft = await starton.post(`/smart-contract/${SMART_CONTRACT_NETWORK}/${SMART_CONTRACT_ADDRESS}/call`, {
              functionName: "mint",
              signerWallet: WALLET_IMPORTED_ON_STARTON,
              speed: "low",
              params: [receiverAddress, metadataCid],
          })
          return nft.data;
      }
      const RECEIVER_ADDRESS = "0x4653CeA34af4B3cF4B27C912A5BBEE015b9E7Fb0";
      const ipfsImgData = await uploadImageOnIpfs();
      const ipfsMetadata = await uploadMetadataOnIpfs(ipfsImgData.cid);
      const nft = await mintNFT(RECEIVER_ADDRESS,ipfsMetadata.cid)
      console.log(nft)
      res.status(201).json({
          transactionHash:nft.transactionHash,
          cid:ipfsImgData.cid
      })
    })
    app.listen(port,()=>{
      console.log('Server is running on port '+ port);
    })