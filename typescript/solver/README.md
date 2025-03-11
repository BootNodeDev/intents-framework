# Solver Directory Overview

The solver directory contains the implementation of the Intent Solver, a TypeScript application designed to listen to blockchain events and process intents accordingly. This application plays a crucial role in handling events from different sources and executing the necessary actions based on those events.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Managing Solvers](#managing-solvers)
- [Intent Filtering](#intent-filtering)
- [Logging](#logging)

## Directory Structure

```
solver/
├── index.ts
├── logger.ts
├── NonceKeeperWallet.ts
├── patch-bigint-buffer-warn.js
├── test/
├── config/
│  ├── index.ts
│  ├── allowBlockLists.ts
│  ├── chainMetadata.ts
│  └── types.ts
└── solvers/
    ├── index.ts
    ├── BaseFiller.ts
    ├── BaseListener.ts
    ├── types.ts
    ├── utils.ts
    ├── contracts/
    └── <eco|hyperlane7683>/
        ├── index.ts
        ├── listener.ts
        ├── filler.ts
        ├── types.ts
        ├── utils.ts
        ├── contracts/
        └── config/
            ├── index.ts
            ├── metadata.ts
            └── allowBlockLists.ts
```

### Description of Key Files and Directories

- **solver/index.ts**: The main entry point of the solver application. It initializes and starts the listeners and fillers for different solvers.
- **logger.ts**: Contains the Logger class used for logging messages with various formats and levels.
- **NonceKeeperWallet.ts**: A class that extends ethers Wallet and prevents nonces race conditions when the solver needs to fill different intents (from different solutions) in the same network.
- **patch-bigint-buffer-warn.js**: A script to suppress specific warnings related to BigInt and Buffer, ensuring cleaner console output.
- **solvers/**: Contains implementations of different solvers and common utilities.
  - **BaseListener.ts**: An abstract base class that provides common functionality for event listeners. It handles setting up contract connections and defines the interface for parsing event arguments.
  - **BaseFiller.ts**: An abstract base class that provides common functionality for fillers. It handles the solver's lifecycle `prepareIntent`, `fill`, and `settle`.
    - **`prepareIntent`**: evaluate allow/block lists, balances, and run the defined rules to decide whether to fill or not an intent.
    - **`fill`**: The actual filling.
    - **`settle`**: The settlement step, can be avoided.
  - **<eco|hyperlane7683>/**: Implements the solvers for the ECO and Hyperlane7683 domains.
    - **listener.ts**: Extends `BaseListener` to handle domain-specific events.
    - **filler.ts**: Extends `BaseFiller` to handle domain-specific intents.
    - **contracts/**: Contains contract ABI and type definitions for interacting with domain-specific contracts.
  - **index.ts**: Exports the solvers to be used in the main application.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (version compatible with your project's requirements)
- [Yarn](https://yarnpkg.com/)

### Steps

1. Navigate to the solver directory:

   ```sh
   cd typescript/solver
   ```

2. Install the dependencies:

   ```sh
   yarn install
   ```

3. Build the project:

   ```sh
   yarn build
   ```

## Usage

### Running the Solver Application

Start the solver application:

```sh
yarn solver
```

This will run the compiled JavaScript code from the `dist` directory, initializing and starting all enabled solvers as defined in `config/solvers.json`. Each solver's status (enabled/disabled) can be configured in this JSON file.

### Development Mode

Run in watch mode for development:

```sh
yarn dev
```

## Managing Solvers

### Adding a New Solver

You can add a new solver in two ways:

```sh
# Interactive mode - will prompt for solver name and options
yarn solver:add

# Direct mode - specify the solver name as an argument
yarn solver:add mySolver
```

This will:

1. Validate the solver name
2. Create the solver directory structure
3. Generate necessary files with boilerplate code
4. Update the solvers index
5. Add solver configuration
6. Set up allow/block lists

The script creates the following structure:

```
solvers/
└── yourSolver/
    ├── index.ts
    ├── listener.ts
    ├── filler.ts
    ├── types.ts
    ├── contracts/
    ├── rules/
    │   └── index.ts
    └── config/
        ├── index.ts
        ├── metadata.ts
        └── allowBlockLists.ts
```

After creation:

1. Add your contract ABI to: `solvers/yourSolver/contracts/`
2. Run `yarn contracts:typegen` to generate TypeScript types
3. Update the listener and filler implementations
4. Configure your solver options in `config/solvers.ts`
5. Update metadata in `solvers/yourSolver/config/metadata.ts`

### Removing Solvers

To remove existing solvers:

```sh
yarn solver:remove
```

This will:

1. Show a list of existing solvers (use space to select multiple, enter to confirm)
2. Ask for confirmation before proceeding
3. Remove the selected solver directories
4. Update the solvers index
5. Remove solver configurations
6. Clean up generated typechain files

You can cancel the removal operation at any time by pressing 'q'.

## Intent Filtering

Configure which intents to fill or ignore using allow/block lists. Configure at:

- Global level: `config/allowBlockLists.ts`
- Solver level: `solvers/<solver>/config/allowBlockLists.ts`

```typescript
const allowBlockLists: AllowBlockLists = {
  allowList: [],
  blockList: [],
};
```

Format:

```typescript
type Wildcard = "*";

type AllowBlockListItem = {
   senderAddress: string | string[] | Wildcard
   destinationDomain: string | string[] | Wildcard
   recipientAddress: string | string[] | Wildcard
}

type AllowBlockLists = {
   allowList: AllowBlockListItem[]
   blockList: AllowBlockListItem[]
}
```

Both the allow-list and block-lists have "any" semantics. In other words, the Solver will deliver intents that match any of the allow-list filters, and ignore intents that match any of the block-list filters.

The block-list supersedes the allow-list, i.e. if a message matches both the allow-list and the block-list, it will not be delivered.

## Logging

The application uses a custom Logger class. Default: `stdout` with `INFO` level.

Customize using pino transports. See [pino transports docs](https://github.com/pinojs/pino/blob/main/docs/transports.md). There's an example for logging to a Syslog server running on `localhost` commented in [logger.ts](logger.ts).
