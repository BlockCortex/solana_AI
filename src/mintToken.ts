import { percentAmount, generateSigner, signerIdentity, createSignerFromKeypair, createGenericFile } from '@metaplex-foundation/umi';
import { TokenStandard, createAndMint, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import secret from '../guideSecret.json';
import { base58 } from "@metaplex-foundation/umi/serializers";

import fs from 'fs';
import path from 'path';
import {
	createV1,
	findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";
const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=da3bfd20-ff75-49ed-923f-49ac837b7341','finalized');

const userWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const userWalletSigner = createSignerFromKeypair(umi, userWallet);

const filePath = path.resolve(__dirname, './nukeV2.jpg');
const fileContent = fs.readFileSync(filePath);
const umiImageFile = createGenericFile(fileContent, "./nukeV2.jpg", {
  tags: [{ name: "Content-Type", value: "image/jpg" }],
});

umi.use(signerIdentity(userWalletSigner));
umi.use(mplTokenMetadata());
umi.use(irysUploader());

async function uploadImage() {
  console.log("Uploading image to Arweave via Irys");
  const imageUris = await umi.uploader.upload([umiImageFile]);
  console.log("Image uploaded. URI:", imageUris[0]);
  return imageUris[0];
}

async function mintToken() {
  try {
    const imageUri = await uploadImage();
    const metadata = {
      name: "NukeBot Layer2",
      symbol: "$NukeL2",
      uri: imageUri,
      description: "Liquidity Provisioning via NukeBot. A branch of the CoinBurst Ecosystem.",
    };
    // const metadataUri = await umi.uploader.uploadJson(metadata).catch((err) => {
    //     throw new Error(err);
    //   });
    
    const mint = generateSigner(umi);
    await createAndMint(umi, {
      mint,
      authority: umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: percentAmount(0.0),
      decimals: 9,
      amount: 4200000069_000000000,
      tokenOwner: userWallet.publicKey,
      tokenStandard: TokenStandard.Fungible,
    }).sendAndConfirm(umi);

    console.log("Successfully minted tokens (", mint.publicKey, ")");



    // await findMetadataPda(umi, {
    //   mint: mint.publicKey,
    // });
  
    //  // add metadata to our already initialized token using `createV1` helper 
    // const tx = await createV1(umi, {
    //   mint,

    //   authority: umi.identity,
    //   payer: umi.identity,
    //   updateAuthority: umi.identity,
    //   name: metadata.name,
    //   symbol: metadata.symbol,
    //   uri: metadata.uri,
    //   sellerFeeBasisPoints: percentAmount(0), // 5.5%
    //   tokenStandard: TokenStandard.Fungible,
    // }).sendAndConfirm(umi);
  
    // let txSig = base58.deserialize(tx.signature);
    // console.log(txSig)
  } catch (err) {
    console.error("Error updating tokens:", err);
  }
}

mintToken();
