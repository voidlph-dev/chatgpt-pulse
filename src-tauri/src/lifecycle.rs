//! Keep the UI event loop alive while background capture releases its resources.
use std::sync::atomic::{AtomicU8, Ordering};

#[derive(Default)]
pub struct ExitFlow(AtomicU8);
#[derive(Debug, PartialEq)]
pub enum ExitAction { Begin, Wait, Finish }
impl ExitFlow {
    pub fn requested(&self) -> ExitAction {
        match self.0.compare_exchange(0, 1, Ordering::SeqCst, Ordering::SeqCst) {
            Ok(_) => ExitAction::Begin,
            Err(2) => ExitAction::Finish,
            Err(_) => ExitAction::Wait,
        }
    }
    pub fn ready(&self) { self.0.store(2, Ordering::SeqCst); }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn repeated_exit_requests_cannot_skip_cleanup_or_start_it_twice() {
        let flow = ExitFlow::default();
        assert_eq!(flow.requested(), ExitAction::Begin);
        for _ in 0..20 { assert_eq!(flow.requested(), ExitAction::Wait); }
        flow.ready();
        assert_eq!(flow.requested(), ExitAction::Finish);
    }
}
