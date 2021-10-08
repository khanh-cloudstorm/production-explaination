# Install Homebrew
chsh -s /bin/zsh
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
brew install node
npm install --global yarn
cd
cd Desktop
git clone https://github.com/khanh-cloudstorm/production-explaination.git
cd production-explaination
yarn install
yarn start
