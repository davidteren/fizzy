# Mutineer benchmark findings on Fizzy

Findings from running [mutineer](https://github.com/davidteren/mutineer) (Ruby mutation testing) against Fizzy at `aef43ac9` on 2026-10-26. Results and harness: [davidteren/mutineer-benchmarks](https://github.com/davidteren/mutineer-benchmarks) (branch `benchmark/fizzy-harness`); full log in its `LOG.md`.

## Environment
- Debian 13, 8 vCPU Intel Xeon, 15 GB RAM, Linux 6.12 (shared cloud machine, timings are noisy).
- Ruby 4.0.6. Fizzy pins 4.0.9; `.ruby-version` was changed locally (not committed). Rails 8.2.0.alpha (main), SQLite.
- Extra apt packages: `libyaml-dev`, `libvips`, `build-essential`.
- Mutineer 1.7.0 (`e23e4a4`) plus fix `8b9fb5b` on local mutineer branch `benchmark/fizzy-harness` (not pushed).
- Baseline: `bin/rails test test/models` = 750 tests, 0 failures, 4 skips, 7.05 s.

## Whole `app/models` run (issue davidteren/mutineer#349)
`mutineer run <files> --test <all 104 test/models files> --rails --strategy redefine --operators all --format json`, split into 4 parallel copies of the app.

| Metric | Value | Meaning |
|---|---|---|
| Wall time | 38 min (longest shard) | ~2.3 h compute total |
| Throughput | ~0.7 mutants/s per worker | total mutants / summed shard seconds |
| Total mutants | 5,713 | all operators over 165 model files |
| No coverage | 987 | no test executed the mutated line |
| Attempted | 4,652 | mutants actually run against tests |
| Killed | 3,485 | a test failed (good) |
| Survived | 1,085 | tests still passed: test gaps |
| Timeout | 82 | no verdict within the time limit |
| Ran at load | 14 | broke while loading code |
| Errored | 0 | |
| Declined | 93 | operator chose not to emit |
| Unplaceable + skipped invalid | 54 + 6 = 60 | the "unrun" mutants, 1.3% of attempted |
| Unrun warning | did not fire | limit is 10% (`Reporter::UNRUN_SHARE_LIMIT`) |

Score on clear verdicts: 3,485 / (3,485 + 1,085) = 76%.

Files with the most survivors (best targets for new tests):
68 `account/data_transfer/record_set.rb`, 62 `account/data_transfer/action_text/rich_text_record_set.rb`, 47 `account/seeder.rb`, 41 `account/import.rb`, 37 `event/description.rb`, 35 `card/activity_spike/detector.rb`, 34 `card/entropic.rb`, 34 `filter.rb`, 32 `zip_file/reader.rb`, 30 `zip_file/reader/io.rb`.

## Mutineer issues found
1. **Reload strategy errored on every mutant of lazily loaded concerns** (fixed in mutineer `8b9fb5b`). The mutant's `module Card::Closeable` autoloaded `Card`, which autoloaded the original concern mid-load, so `included` was defined twice (`ActiveSupport::Concern::MultipleIncludedBlocks`). Before: 22/22 errored on `card/closeable.rb`. With `CI=1` (eager load) it worked. Fix: load the concern before forgetting its blocks.
2. **A run where every mutant errors exits 0** without `--threshold`. Not fixed yet; would pass CI silently.
3. **`--daemon` drops to one worker for multi-database apps** (Fizzy has primary + cable in test). By design, but a real gap: the whole-app reload run was serial and was stopped after ~70 min without finishing.
4. **`--dry-run` ignores `--format json`**, so harnesses must parse text.
5. **No elapsed time in JSON**, and the unrun warning is stderr only.
6. **Whole-directory `--rails` runs need explicit `--test` files.**

## Steps for the next agent
1. In davidteren/mutineer: push branch `benchmark/fizzy-harness` with `8b9fb5b` (drop the `wip` and `bench/` commits; the harness now lives in mutineer-benchmarks). Open a PR labelled for type (fix), area (reload strategy / concerns) and target release (tentative 1.8.0), with a regression test that autoloads a concern lazily.
2. Fix issue 2: non-zero exit when every attempted mutant errors (or errored share exceeds a limit). Separate commit, `fix:` prefix, with a test.
3. Open issues (or commits on the same branch, per David's call) for 3–6; issue 5 is an additive JSON schema change (`elapsed_seconds`, `unrun_warning`).
4. Update davidteren/mutineer#349 / CHANGELOG with the table above (ask David before commenting publicly).
5. In this fork: create `benchmark/mutineer-baseline` from `aef43ac9` with only the Gemfile mutineer entry; keep any Fizzy test improvements on separate `feature/`/`issue/` branches for upstreaming. Point `mutineer-benchmarks/targets/fizzy.yml` at that branch.
6. Re-run the slice benchmark (median of 3, reload and redefine) on 1.7.0 vs the fixed branch and commit results to mutineer-benchmarks.
7. Branch names must start with a type prefix (`issue/`, `spike/`, `feature/`, `benchmark/`). Never merge, release or comment publicly without David's go-ahead.
