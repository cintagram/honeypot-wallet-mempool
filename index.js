import { JsonRpcProvider, Wallet, parseUnits } from 'ethers';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';

// 설정부분임 알아서 설정해
const provider = new JsonRpcProvider('RPC URL');
const PRIVATE_KEY = '출금할 코인지갑의 개인키';
const receiverAddress = '받을 지갑 주소';
const INTERVAL = 10000; // 밀리초임 (10초)

const flashbotsRelayUrl = 'https://rpc.flashbots.net/fast';
const wallet = new Wallet(PRIVATE_KEY, provider);
let lastBalance = 0n;

async function createFlashbotsProvider() {
    try {
        return await FlashbotsBundleProvider.create(
            provider,
            Wallet.createRandom(),
            flashbotsRelayUrl
        );
    } catch (error) {
        console.error('번들생성을 위한 일회용지갑생성중 모루:', error.message);
        process.exit(1);
    }
}

async function flashibo(value) {
    const flashbotsProvider = await createFlashbotsProvider();
    let blockNumber = await provider.getBlockNumber();
    let nonce = await wallet.getNonce();    
    //원래 번들도 있었으나 잘 안되서 mempool만 넣음
    await fallbackToPublicMempool(value);
}

async function fallbackToPublicMempool(value) {
    console.log('공개 mempool로 시도중');
    try {
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        const txResponse = await wallet.sendTransaction({
            to: receiverAddress,
            value: value,
            gasPrice: gasPrice
        });
        console.log('공개 mempool로 보냄. TXID:', txResponse.hash);
    } catch (error) {
        console.error('공개 mempool 실패:', error.message);
    }
}

async function monitorWalletBalance() {
    console.log('지갑 모니터링중이다냥...');
    setInterval(async () => {
        try {
            const currentBalance = await provider.getBalance(wallet.address);
            
            if (currentBalance > lastBalance && currentBalance > 0n) {
                if (currentBalance > 0n) {
                    console.log(`새 입금 확인! ETH`);
    
                    const feeData = await provider.getFeeData();
                    const gasPrice = feeData.gasPrice;
                    const gasLimit = 21000n;
                    const gasFee = gasPrice * gasLimit;
                    let amountToSend = currentBalance - gasFee;
    
                    if (amountToSend > 0n) {
                        console.log(`출금시키는중.`);
                        lastBalance = currentBalance;
                        console.log("amountToSend", amountToSend);
                        await flashibo(amountToSend);
                    } else {
                        console.log('가스비 부족해서 더 올때까지 기다리는중');
                    }
    
                    
                }
            }
        } catch (error) {
            console.error('에러 ㅅㅂ:', error.message);
        }
    }, INTERVAL);
}

monitorWalletBalance();