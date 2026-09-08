// A keyboard-only reference route through the real map. Shared by deterministic
// checks and browser playthroughs; it never changes the player's position.
export function createLevel2Route(takeoffOffset = 0) {
    const jumped = new Set();
    let jumpUntil = -1;
    let chamber = 0;
    return (player, tick) => {
        let right = true, left = false, jumpStarted = null;
        const launch = name => {
            jumpUntil = tick + 18;
            jumpStarted = name;
            jumped.add(name);
        };
        if (player.x > 176 + takeoffOffset && player.grounded && !jumped.has('warm-up')) launch('warm-up');
        if (player.x > 1090 && player.grounded && chamber === 0) {
            launch('first wall');
            chamber = 1;
        }
        if (chamber === 1 && player.gripping && player.wallSide === 1 && player.vy >= 0 && tick >= jumpUntil) {
            launch('push left');
            chamber = 2;
        }
        if (chamber === 2) {
            right = false;
            left = true;
            if (player.x <= 1030 && (player.gripping || player.grounded) && tick >= jumpUntil) {
                launch('push right');
                chamber = 3;
                right = true;
                left = false;
            }
        }
        if (player.x > 1680 + takeoffOffset && player.grounded && !jumped.has('pool')) launch('pool');
        if (player.x > 1780 && player.grounded && player.y < 450 && !jumped.has('stepping stone')) launch('stepping stone');
        if (player.x > 2380 + takeoffOffset && player.grounded && !jumped.has('finish')) launch('finish');
        return {
            left, right, up: tick < jumpUntil, jumpStarted,
            down: (player.x > 315 && player.x < 630) || (player.x > 2080 && player.x < 2350),
        };
    };
}
