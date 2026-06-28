// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DemoTreasury
 * @notice Minimal demo treasury for Demo 3 ("Cross-Chain Treasury Protection").
 *
 *         Funds can only leave through `withdraw`, and `withdraw` can only be called by
 *         the `authorizer` — the Certen-authorized account. In the live demo a cross-chain
 *         move executes ONLY after Certen has gathered the multi-sig quorum (3-of-3:
 *         Treasurer, Foundation, Security Council) and produced a proof. Until that proof
 *         exists, the treasury is frozen no matter who asks.
 */
contract DemoTreasury {
    /// @notice Logical treasury balance (demo units, not wei).
    uint256 public balance;

    /// @notice The only account allowed to move funds. Intended to be the Certen anchor.
    address public authorizer;

    /// @notice Emitted on every successful withdrawal.
    event Withdrawn(uint256 amount, address indexed to);

    /// @notice Emitted on every successful deposit (e.g. the destination leg of a bridge move).
    event Deposited(uint256 amount);

    // NOTE: there is deliberately no key-rotation logic here. This contract is an EXTERNAL
    // account controlled by an Accumulate key page; the authority set (keys, threshold) lives on
    // Accumulate, and rotation is a key-page operation there — it never touches this chain.

    /// @param authorizer_ The Certen-authorized account permitted to withdraw.
    /// @param initial      Opening balance (the demo seeds this as 250,000,000).
    constructor(address authorizer_, uint256 initial) {
        require(authorizer_ != address(0), "Certen: zero authorizer");
        authorizer = authorizer_;
        balance = initial;
    }

    /// @notice Move funds out of the treasury. ONLY the Certen-authorized account may call,
    ///         which in turn only happens once the cross-chain quorum + proof exist.
    /// @param amount The amount to withdraw.
    /// @param to     The destination address (recorded for the audit trail).
    function withdraw(uint256 amount, address to) external {
        require(msg.sender == authorizer, "Certen: unauthorized");
        require(amount <= balance, "Certen: insufficient balance");
        require(to != address(0), "Certen: zero destination");
        balance -= amount;
        emit Withdrawn(amount, to);
    }

    /// @notice Add funds to the treasury — used as the destination ("credit") leg of a
    ///         cross-chain move, and to top the balance back up between demo runs. Only the
    ///         Certen-authorized account may call.
    /// @param amount The amount to credit.
    function deposit(uint256 amount) external {
        require(msg.sender == authorizer, "Certen: unauthorized");
        balance += amount;
        emit Deposited(amount);
    }
}
