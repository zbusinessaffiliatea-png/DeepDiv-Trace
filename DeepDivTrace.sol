// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DeepDivTrace - Transparent Aid Distribution Protocol
 * @dev Secure, role-based resource distribution for Al-Awtar Organization
 * @author (DeepDiv)group
 */
contract DeepDivTrace is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20; // استخدام SafeERC20 لحماية التحويلات

    bytes32 public constant ALLOCATOR_ROLE = keccak256("ALLOCATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    IERC20 public aidToken; 

    struct Campaign {
        string name;
        string metadataIPFS; 
        uint256 targetAmount;
        uint256 currentFunds;
        bool isActive;
    }

    mapping(uint256 => Campaign) public campaigns;
    uint256 public campaignCounter;

    event CampaignLaunched(uint256 indexed id, string name, uint256 target);
    event FundsDonated(uint256 indexed id, address indexed donor, uint256 amount);
    // تم إضافة عنوان المستلم (recipient) لزيادة الشفافية
    event FundsAllocated(uint256 indexed id, address indexed recipient, string proofIPFS, uint256 amount);

    constructor(address _aidTokenAddress) {
        require(_aidTokenAddress != address(0), "Invalid token address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ALLOCATOR_ROLE, msg.sender);
        
        aidToken = IERC20(_aidTokenAddress);
    }

    function createCampaign(string memory _name, string memory _ipfs, uint256 _target) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        campaignCounter++;
        campaigns[campaignCounter] = Campaign(_name, _ipfs, _target, 0, true);
        emit CampaignLaunched(campaignCounter, _name, _target);
    }

    function donate(uint256 _campaignId, uint256 _amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(campaigns[_campaignId].isActive, "Campaign inactive");
        require(_amount > 0, "Amount must be > 0");

        // تطبيق نمط (CEI): تحديث الحالة أولاً
        campaigns[_campaignId].currentFunds += _amount;
        
        // إجراء التحويل باستخدام safeTransferFrom
        aidToken.safeTransferFrom(msg.sender, address(this), _amount);

        emit FundsDonated(_campaignId, msg.sender, _amount);
    }

    function allocateFunds(uint256 _campaignId, uint256 _amount, string memory _proofIPFS, address _to) 
        external 
        onlyRole(ALLOCATOR_ROLE) 
        nonReentrant 
    {
        require(campaigns[_campaignId].currentFunds >= _amount, "Insufficient funds in campaign");
        require(_to != address(0), "Invalid recipient");

        // تحديث الحالة أولاً
        campaigns[_campaignId].currentFunds -= _amount;
        
        // إجراء التحويل باستخدام safeTransfer
        aidToken.safeTransfer(_to, _amount);

        // تسجيل الحدث مع عنوان المستلم
        emit FundsAllocated(_campaignId, _to, _proofIPFS, _amount);
    }

    function pauseProtocol() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpauseProtocol() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
