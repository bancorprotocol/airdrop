pragma solidity 0.4.26;
import 'bancor-contracts/solidity/contracts/utility/TokenHolder.sol';
import 'bancor-contracts/solidity/contracts/token/interfaces/IERC20Token.sol';
import 'bancor-contracts/solidity/contracts/token/interfaces/ISmartToken.sol';

interface IConverterWrapper {
    function token() external view returns (IERC20Token);
    function reserveTokens(uint256 _index) external view returns (IERC20Token);
    function getReserveBalance(IERC20Token _reserveToken) external view returns (uint256);
    function withdrawTokens(IERC20Token _token, address _to, uint256 _amount) external;
    function disableConversions(bool _disable) external;
    function transferOwnership(address _newOwner) external;
    function acceptOwnership() external;
    function acceptTokenOwnership() external;
}

contract FixedSupplyUpgrader is TokenHolder {
    constructor() TokenHolder() public {
    }

    function execute(IConverterWrapper _oldConverter, IConverterWrapper _newConverter, address _bntWallet, address _communityWallet) external
        ownerOnly
        validAddress(_oldConverter)
        validAddress(_newConverter)
        validAddress(_bntWallet)
        validAddress(_communityWallet)
    {
        IERC20Token bntToken = _oldConverter.token();
        IERC20Token ethToken = _oldConverter.reserveTokens(0);
        ISmartToken smartToken = ISmartToken(_newConverter.token());
        smartToken.acceptOwnership();
        _oldConverter.acceptOwnership();
        _newConverter.acceptOwnership();
        _oldConverter.disableConversions(true);
        uint256 bntAmount = bntToken.totalSupply() / 10;
        uint256 ethAmount = _oldConverter.getReserveBalance(ethToken);
        _oldConverter.withdrawTokens(ethToken, _newConverter, ethAmount);
        require(bntToken.transferFrom(_bntWallet, _newConverter, bntAmount));
        smartToken.issue(_bntWallet, bntAmount);
        smartToken.issue(_communityWallet, bntAmount);
        smartToken.transferOwnership(_newConverter);
        _newConverter.acceptTokenOwnership();
        _newConverter.transferOwnership(owner);
        _oldConverter.transferOwnership(owner);
    }
}
