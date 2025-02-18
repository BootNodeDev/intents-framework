<p align="center">
    <a href="https://www.openintents.xyz/">
      <img src="https://www.bootnode.dev/external/github-headers/oif.jpg" alt="open intents framework banner">
    </a>
</p>

<div align="center"><strong>Intents For Everyone, With Everyone</strong></div>
<div align="center">A modular, open-source framework for permissionless, scalable intent execution.</div>
<br />

# Open Intents Framework
[![License: MIT][license-badge]][license]

[license]: https://www.apache.org/licenses/LICENSE-2.0
[license-badge]: https://img.shields.io/badge/License-Apache-blue.svg

## Description

The Open Intents Framework is an open-source framework that provides a full stack of smart contracts, solvers and UI with modular abstractions for settlement to build and deploy intent protocols across EVM chains.

With out-of-the-box ERC-7683 support, the Open Intents Framework standardizes cross-chain transactions and unlocks intents on day 1 for builders in the whole Ethereum ecosystem (and beyond).

## Features

- **ERC-7683 Reference Implementation:** Standardizes cross-chain intent execution, making transactions more interoperable and predictable across EVM chains.
- **Open-Source Reference Solver:** application that provides customizable protocol-independent features—such as indexing, transaction submission, and rebalancing.
- **Composable Smart Contracts:** composable framework where developers can mix and match smart contracts, solvers, and settlement layers to fit their use case
- **Ready-to-Use UI:** A pre-built, customizable UI template that makes intents accessible to end users.
- **Credibly Neutral:** works across different intent-based protocols and settlement mechanisms

## Directory Structure

- `solidity/` - Contains the smart contract code written in Solidity.
- `typescript/solvers/` - Houses the TypeScript implementations of the solvers that execute the intents.

## Getting Started

### Prerequisites

- Node.js
- yarn
- Git

### Installation

```bash
git clone https://github.com/BootNodeDev/intents-framework.git
cd intents-framework
yarn
```

### Running the Solver

Run the following commands from the root directory (you need `docker` installed)

```bash
docker build -t solver .
```

Once it finish building the image

```bash
docker run -it -e [PRIVATE_KEY=SOME_PK_YOU_OWN | MNEMONIC=SOME_MNEMONIC_YOU_OWN] solver
```

The solver is run using `pm2` inside the docker container so `pm2` commands can still be used inside a container with the docker exec command:

```bash
# Monitoring CPU/Usage of each process
docker exec -it <container-id> pm2 monit
# Listing managed processes
docker exec -it <container-id> pm2 list
# Get more information about a process
docker exec -it <container-id> pm2 show
# 0sec downtime reload all applications
docker exec -it <container-id> pm2 reload all
```

### Versioning

For the versions available, see the tags on this repository.

### Releasing packages to NPM

We use [changesets](https://github.com/changesets/changesets) to release to NPM. You can use the `release` script in `package.json` to publish.

Currently the only workspace being released as an NPM package is the one in `solidity`, which contains the contracts and typechain artifacts.

### License

This project is licensed under the Apache 2.0 License - see the LICENSE.md file for details.
