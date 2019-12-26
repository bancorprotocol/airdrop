pragma solidity 0.4.26;
import 'bancor-contracts/solidity/contracts/utility/TokenHolder.sol';
import 'bancor-contracts/solidity/contracts/bancorx/interfaces/IBancorX.sol';
import 'bancor-contracts/solidity/contracts/token/interfaces/IERC20Token.sol';

contract AirDropper is TokenHolder {
    enum State {
        saveEnabled,
        noneEnabled,
        sendEnabled
    }

    State public state;
    bytes32 public hash;
    address public sender;

    mapping (address => uint256) public saveBalances;
    mapping (address => uint256) public sendBalances;

    constructor() TokenHolder() public {
        state = State.saveEnabled;
    }

    function set(address _sender) external ownerOnly {
        sender = _sender;
    }

    function disableSave() external ownerOnly {
        require(state == State.saveEnabled);
        state = State.noneEnabled;
    }

    function enableSend() external ownerOnly {
        require(state == State.noneEnabled);
        state = State.sendEnabled;
    }

    function saveAll(address[] _targets, uint256[] _amounts) external {
        require(msg.sender == sender && state == State.saveEnabled);
        uint256 length = _targets.length;
        require(length == _amounts.length);
        for (uint256 i = 0; i < length; i++) {
            address target = _targets[i];
            uint256 amount = _amounts[i];
            require(saveBalances[target] == 0);
            saveBalances[target] = amount;
            hash ^= keccak256(abi.encodePacked(_targets[i], _amounts[i]));
        }
    }

    function sendEth(IERC20Token _token, address[] _targets, uint256[] _amounts) external {
        require(msg.sender == sender && state == State.sendEnabled);
        uint256 length = _targets.length;
        require(length == _amounts.length);
        for (uint256 i = 0; i < length; i++) {
            address target = _targets[i];
            uint256 amount = _amounts[i];
            require(saveBalances[target] == amount);
            require(sendBalances[target] == 0);
            require(_token.transfer(target, amount));
            sendBalances[target] = amount;
        }
    }

    function sendEos(IBancorX _bancorX, bytes32 _target, uint256 _amount) external {
        require(msg.sender == sender && state == State.sendEnabled);
        require(saveBalances[_bancorX] == _amount);
        require(sendBalances[_bancorX] == 0);
        _bancorX.xTransfer("eos", _target, _amount, 0);
        sendBalances[_bancorX] = _amount;
    }
}
