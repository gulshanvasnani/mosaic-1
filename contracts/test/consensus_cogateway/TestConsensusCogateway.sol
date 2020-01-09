pragma solidity >=0.5.0 <0.6.0;
import "../../consensus-gateway/ConsensusCogateway.sol";

/**
 * @title TestConsensusCogateway
 *
 * @notice Test contract used for testing ConsensusCogateway contract.
 */
contract TestConsensusCogateway is ConsensusCogateway {

    /* Special function */

    constructor()
     public
     ConsensusCogateway()
     { }


    /* Public functions */

    /**
     * It sets current metablock height.
     *
     * @param _metablockHeight Current metablock height.
     */
    function setMetablock(uint256 _metablockHeight) public {
        currentMetablockHeight = _metablockHeight;
    }

    /**
     * @notice It sets storageroots for a blockheight.
     *
     * @param _blockHeight Block height.
     * @param _storageRoot Storage root at block height.
     */
    function setStorageRoots(uint256 _blockHeight, bytes32 _storageRoot) public {
        storageRoots[_blockHeight] = _storageRoot;
    }

    /**
     * @notice It sets inbound channel identifier.
     *
     * @param _inboundChannelIdentifier Inboundchannel identifier.
     */
    function setInboundChannelIdentifier(bytes32 _inboundChannelIdentifier) public {
        inboundChannelIdentifier =  _inboundChannelIdentifier;
    }
}