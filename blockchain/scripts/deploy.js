const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("==================================================");
  console.log(" Deploying MedicalRecordAccess Smart Contract");
  console.log("==================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

  const MedicalRecordAccess = await hre.ethers.getContractFactory("MedicalRecordAccess");
  const contract = await MedicalRecordAccess.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✓ MedicalRecordAccess deployed successfully to:", contractAddress);

  // Extract ABI
  const artifact = await hre.artifacts.readArtifact("MedicalRecordAccess");
  const deploymentInfo = {
    address: contractAddress,
    network: hre.network.name,
    chainId: hre.network.config.chainId || 31337,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  // Target output files
  const targets = [
    path.join(__dirname, "..", "deployed-contract.json"),
    path.join(__dirname, "..", "..", "backend", "src", "config", "contractArtifact.json"),
    path.join(__dirname, "..", "..", "frontend", "src", "contractArtifact.json"),
  ];

  targets.forEach((targetPath) => {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("Saved deployment artifact to:", targetPath);
  });

  console.log("Deployment completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
