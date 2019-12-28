pragma solidity 0.4.26;
import 'bancor-contracts/solidity/contracts/utility/TokenHolder.sol';
import 'bancor-contracts/solidity/contracts/bancorx/interfaces/IBancorX.sol';
import 'bancor-contracts/solidity/contracts/token/interfaces/IERC20Token.sol';

contract AirDropper is TokenHolder {
    enum State {
        storeEnabled,
        noneEnabled,
        transferEnabled
    }

    State public state;
    address public executor;
    bytes32 public storedBalancesCRC;

    mapping (address => uint256) public storedBalances;
    mapping (address => uint256) public transferredBalances;

    constructor() TokenHolder() public {
        state = State.storeEnabled;
    }

    function setExecutor(address _executor) external ownerOnly {
        executor = _executor;
    }

    function disableStore() external ownerOnly {
        require(state == State.storeEnabled);
        state = State.noneEnabled;
    }

    function enableTransfer() external ownerOnly {
        require(state == State.noneEnabled);
        state = State.transferEnabled;
    }

    function storeBatch(address[] _targets, uint256[] _amounts) external {
        bytes32 crc;
        require(msg.sender == executor && state == State.storeEnabled);
        uint256 length = _targets.length;
        require(length == _amounts.length);
        for (uint256 i = 0; i < length; i++) {
            address target = _targets[i];
            uint256 amount = _amounts[i];
            require(storedBalances[target] == 0);
            storedBalances[target] = amount;
            crc ^= keccak256(abi.encodePacked(_targets[i], _amounts[i]));
        }
        storedBalancesCRC ^= crc;
    }

    function transferEth(IERC20Token _token, address[] _targets, uint256[] _amounts) external {
        require(msg.sender == executor && state == State.transferEnabled);
        uint256 length = _targets.length;
        require(length == _amounts.length);
        for (uint256 i = 0; i < length; i++) {
            address target = _targets[i];
            uint256 amount = _amounts[i];
            require(storedBalances[target] == amount);
            require(transferredBalances[target] == 0);
            require(_token.transfer(target, amount));
            transferredBalances[target] = amount;
        }
    }

    function transferEos(IBancorX _bancorX, bytes32 _target, uint256 _amount) external {
        require(msg.sender == executor && state == State.transferEnabled);
        require(storedBalances[_bancorX] == _amount);
        require(transferredBalances[_bancorX] == 0);
        _bancorX.xTransfer("eos", _target, _amount, 0);
        transferredBalances[_bancorX] = _amount;
    }
}
