pragma solidity ^0.5.0;

// Copyright 2019 OpenST Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import "../../consensus/ConsensusI.sol";
import "../../reputation/ReputationI.sol";
import "../core/MockCore.sol";

contract MockConsensus is ConsensusI, ReputationI {

    /* Storage */

    uint256 public constant MIN_VALIDATOR = uint256(10);

    uint256 public constant JOIN_LIMIT = uint256(15);

    MockCore public mockCore;

    mapping(address => uint256) public rep;

    mapping(address => bytes32) public precommitts;


    /* Special Functions */

    constructor(
        bytes20 _chainId,
        uint256 _epochLength,
        uint256 _height,
        bytes32 _parent,
        uint256 _gasTarget,
        uint256 _dynasty,
        uint256 _accumulatedGas,
        bytes32 _source,
        uint256 _sourceBlockHeight
    )
        public
    {
        mockCore = new MockCore(
            _chainId,
            _epochLength,
            MIN_VALIDATOR,
            JOIN_LIMIT,
            ReputationI(this),
            _height,
            _parent,
            _gasTarget,
            _dynasty,
            _accumulatedGas,
            _source,
            _sourceBlockHeight
        );
    }


    /* External Functions */

    function joinDuringCreation(address _validator)
        external
    {
        rep[_validator] = uint256(1);
        mockCore.joinDuringCreation(_validator);
    }

    function join(address _validator)
        external
    {
        rep[_validator] = uint256(1);
        mockCore.join(_validator);
    }

    function logout(address _validator)
        external
    {
        rep[_validator] = uint256(0);
        mockCore.logout(_validator);
    }

    function isActive(address _validator)
        external
        view
        returns (bool)
    {
        return (rep[_validator] > 0);
    }

    function getReputation(address _validator)
        external
        view
        returns (uint256)
    {
        return rep[_validator];
    }

    function setReputation(address _validator, uint256 _newReputation)
        external
    {
        rep[_validator] = _newReputation;
    }

    function reputation()
        external
        view
        returns (ReputationI)
    {
        return this;
    }

    function coreValidatorThresholds()
        external
        view
        returns (uint256 minimumValidatorCount_, uint256 joinLimit_)
    {
        minimumValidatorCount_ = MIN_VALIDATOR;
        joinLimit_ = JOIN_LIMIT;
    }

    function registerPrecommit(bytes32 _precommitment)
        external
    {
        precommitts[msg.sender] = _precommitment;
    }

    function isPrecommitted(address _core)
        external
        view
        returns (bool)
    {
        return precommitts[_core] != bytes32(0);
    }
}
