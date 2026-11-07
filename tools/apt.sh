#!/bin/sh
# Installs Debian packages from ~/debs (kept by actions/cache), going to the mirror only when the cache is empty, and
# then with timeouts and retries: on some runners apt-get stalled for 25 minutes on the mirror.
#
#   sh tools/apt.sh <package>...
set -e
mkdir -p ~/debs
if ! ls ~/debs/*.deb > /dev/null 2>&1; then
  opts="-o Acquire::http::Timeout=20 -o Acquire::https::Timeout=20 -o Acquire::Retries=5"
  for i in 1 2 3; do timeout 300 sudo apt-get $opts update -qq && break; done
  for i in 1 2 3; do
    timeout 300 sudo apt-get $opts install -y -qq --no-install-recommends --download-only -o dir::cache::archives="$HOME/debs" "$@" > /dev/null && break
    [ "$i" = 3 ] && exit 1
  done
  sudo chown -R "$(id -u)" ~/debs
fi
sudo dpkg -i ~/debs/*.deb > /dev/null
