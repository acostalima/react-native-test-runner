import { AppRegistry, LogBox } from 'react-native';
import { filterRNLogs } from './utils';

const App = () => null;

filterRNLogs();
LogBox.ignoreAllLogs();
AppRegistry.registerComponent('Test', () => App);

const setup = require('./test-runners/zora').default;

const run = setup();

run();
