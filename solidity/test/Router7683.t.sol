// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.25;

// import { Test } from "forge-std/Test.sol";
// import { console2 } from "forge-std/console2.sol";

// import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
// import { Address } from "@openzeppelin/contracts/utils/Address.sol";

// import { StandardHookMetadata } from "@hyperlane-xyz/hooks/libs/StandardHookMetadata.sol";
// import { MockMailbox } from "@hyperlane-xyz/mock/MockMailbox.sol";
// import { MockHyperlaneEnvironment } from "@hyperlane-xyz/mock/MockHyperlaneEnvironment.sol";
// import { TypeCasts } from "@hyperlane-xyz/libs/TypeCasts.sol";
// import { IInterchainSecurityModule } from "@hyperlane-xyz/interfaces/IInterchainSecurityModule.sol";
// import { IPostDispatchHook } from "@hyperlane-xyz/interfaces/hooks/IPostDispatchHook.sol";
// import { TestIsm } from "@hyperlane-xyz/test/TestIsm.sol";
// import { InterchainGasPaymaster } from "@hyperlane-xyz/hooks/igp/InterchainGasPaymaster.sol";
// import {DeployPermit2} from "@uniswap/permit2/test/utils/DeployPermit2.sol";

// import { Router7683 } from "../src/Router7683.sol";

// contract TestInterchainGasPaymaster is InterchainGasPaymaster {
//     uint256 public gasPrice = 10;

//     constructor() {
//         initialize(msg.sender, msg.sender);
//     }

//     function quoteGasPayment(uint32, uint256 gasAmount) public view override returns (uint256) {
//         return gasPrice * gasAmount;
//     }

//     function setGasPrice(uint256 _gasPrice) public {
//         gasPrice = _gasPrice;
//     }

//     function getDefaultGasUsage() public pure returns (uint256) {
//         return DEFAULT_GAS_USAGE;
//     }
// }

// contract Router7683ForTest is Router7683 {
//     constructor(address _mailbox, address permitt2) Router7683(_mailbox, permitt2) {}

//     function get7383LocalDomain() public view returns (uint32) {
//       return _localDomain();
//     }
// }

// contract Router7683BaseTest is Test, DeployPermit2 {
//     using TypeCasts for address;

//     MockHyperlaneEnvironment internal environment;

//     address permit2;

//     uint32 internal origin = 1;
//     uint32 internal destination = 2;

//     TestInterchainGasPaymaster internal igp;

//     Router7683ForTest internal originRouter;
//     Router7683ForTest internal destinationRouter;

//     TestIsm internal testIsm;
//     bytes32 internal testIsmB32;
//     bytes32 internal originRouterB32;
//     bytes32 internal destinationRouterB32;
//     bytes32 internal destinationRouterOverrideB32;

//     uint256 gasPaymentQuote;
//     uint256 gasPaymentQuoteOverride;
//     uint256 internal constant GAS_LIMIT_OVERRIDE = 60_000;

//     address internal admin = makeAddr("admin");
//     address internal owner = makeAddr("owner");
//     address internal sender = makeAddr("sender");

//     function deployProxiedRouter(
//         uint32[] memory _domains,
//         MockMailbox _mailbox,
//         IPostDispatchHook _customHook,
//         IInterchainSecurityModule _ism,
//         address _owner
//     )
//         public
//         returns (Router7683ForTest)
//     {
//         Router7683ForTest implementation = new Router7683ForTest(address(_mailbox), permit2);

//         TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
//             address(implementation),
//             admin,
//             abi.encodeWithSelector(
//                 Router7683.initialize.selector,
//                 address(_customHook),
//                 address(_ism),
//                 _owner,
//                 _domains
//             )
//         );

//         return Router7683ForTest(address(proxy));
//     }

//     function setUp() public virtual {
//         environment = new MockHyperlaneEnvironment(origin, destination);

//         permit2 = deployPermit2();

//         igp = new TestInterchainGasPaymaster();

//         gasPaymentQuote = igp.quoteGasPayment(destination, igp.getDefaultGasUsage());

//         testIsm = new TestIsm();

//         uint32[] memory domains = new uint32[](0);

//         originRouter =
//             deployProxiedRouter(domains, environment.mailboxes(origin), environment.igps(origin), IInterchainSecurityModule(address(0)), owner);

//         destinationRouter =
//             deployProxiedRouter(domains, environment.mailboxes(destination), environment.igps(destination), IInterchainSecurityModule(address(0)), owner);

//         environment.mailboxes(origin).setDefaultHook(address(igp));

//         originRouterB32 = TypeCasts.addressToBytes32(address(originRouter));
//         destinationRouterB32 = TypeCasts.addressToBytes32(address(destinationRouter));
//         testIsmB32 = TypeCasts.addressToBytes32(address(testIsm));
//     }

//     receive() external payable { }
// }


// contract Router7683Test is Router7683BaseTest {
//     using TypeCasts for address;

//     modifier enrollRouters() {
//         vm.startPrank(owner);
//         originRouter.enrollRemoteRouter(destination, destinationRouterB32);

//         destinationRouter.enrollRemoteRouter(origin, originRouterB32);

//         vm.stopPrank();
//         _;
//     }

//     function test_localDomain() public {
//         assertEq(originRouter.get7383LocalDomain(), origin);
//         assertEq(destinationRouter.get7383LocalDomain(), destination);
//     }

//     function testFuzz_enrollRemoteDoamain(uint32 domain) public {
//         // act
//         vm.prank(owner);
//         originRouter.enrollRemoteDomain(domain);

//         // assert
//         bytes32 actualRouter = originRouter.routers(domain);
//         assertEq(actualRouter, TypeCasts.addressToBytes32(address(originRouter)));
//     }

//     function testFuzz_enrollRemoteDomains(uint8 count, uint32 domain) public {
//         vm.assume(count > 0 && count < domain);

//         // arrange
//         // count - # of domains and routers
//         uint32[] memory domains = new uint32[](count);
//         for (uint256 i = 0; i < count; i++) {
//             domains[i] = domain - uint32(i);
//         }

//         // act
//         vm.prank(owner);
//         originRouter.enrollRemoteDomains(domains);

//         // assert
//         uint32[] memory actualDomains = originRouter.domains();
//         assertEq(actualDomains.length, domains.length);
//         assertEq(abi.encode(originRouter.domains()), abi.encode(domains));

//         for (uint256 i = 0; i < count; i++) {
//             bytes32 actualRouter = originRouter.routers(domains[i]);

//             assertEq(actualRouter, TypeCasts.addressToBytes32(address(originRouter)));
//             assertEq(actualDomains[i], domains[i]);
//         }
//     }

//     function testFuzz_enrollRemoteRouters(uint8 count, uint32 domain, bytes32 router) public {
//         vm.assume(count > 0 && count < uint256(router) && count < domain);

//         // arrange
//         // count - # of domains and routers
//         uint32[] memory domains = new uint32[](count);
//         bytes32[] memory routers = new bytes32[](count);
//         for (uint256 i = 0; i < count; i++) {
//             domains[i] = domain - uint32(i);
//             routers[i] = bytes32(uint256(router) - i);
//         }

//         // act
//         vm.prank(owner);
//         originRouter.enrollRemoteRouters(domains, routers);

//         // assert
//         uint32[] memory actualDomains = originRouter.domains();
//         assertEq(actualDomains.length, domains.length);
//         assertEq(abi.encode(originRouter.domains()), abi.encode(domains));

//         for (uint256 i = 0; i < count; i++) {
//             bytes32 actualRouter = originRouter.routers(domains[i]);

//             assertEq(actualRouter, routers[i]);
//             assertEq(actualDomains[i], domains[i]);
//         }
//     }

//     // function test_quoteGasPayment() public enrollRouters {
//     //     // arrange
//     //     bytes memory messageBody = InterchainCreate2FactoryMessage.encode(
//     //         address(1), TypeCasts.addressToBytes32(address(0)), "", new bytes(0), new bytes(0)
//     //     );

//     //     // assert
//     //     assertEq(originRouter.quoteGasPayment(destination, messageBody, new bytes(0)), gasPaymentQuote);
//     // }

//     // function test_quoteGasPayment_gasLimitOverride() public enrollRouters {
//     //     // arrange
//     //     bytes memory messageBody = InterchainCreate2FactoryMessage.encode(
//     //         address(1), TypeCasts.addressToBytes32(address(0)), "", new bytes(0), new bytes(0)
//     //     );

//     //     bytes memory hookMetadata = StandardHookMetadata.overrideGasLimit(GAS_LIMIT_OVERRIDE);

//     //     // assert
//     //     assertEq(
//     //         originRouter.quoteGasPayment(destination, messageBody, hookMetadata),
//     //         igp.quoteGasPayment(destination, GAS_LIMIT_OVERRIDE)
//     //     );
//     // }


// }
