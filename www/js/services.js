angular
  .module('boardGameAdviser')
  .factory('Utils', Utils)
  .service('Status', Status);

function Utils () {

  var jmespath = window.jmespath;
  var lodash = window._;
  var dt = window.dt;

  // Public API here
  return {
    jmespath: jmespath,
    lodash: lodash,
    dt:dt
  };
}

Status.$inject = ['CONSTANTS', 'Utils', '$http', '$timeout', '$q'];
function Status(CONSTANTS, Utils, $http, $timeout, $q) {

  // Algorythm Results
  var responses = {};
  var knowledge = {
    data: {},
    keys: []
  };

  // IA Setup Vars
  var decisionTree = {};
  var randomForest = {};
  var numberOfTrees = CONSTANTS.NUMBER_OF_TREES;
  var iaConfig = {
    trainingSet : [],
    categoryAttr: 'id',
    ignoredAttributes: CONSTANTS.ATTR_TO_IGNORE
  };

  // Public API here
  var service = {
    start: start,
    getGame: getGame,
    getQuestion: getQuestion,
    predict: predict,
    put: put,
    clear: clear,
    responses : getResponses
  };

  return service;

  ////////////

  function start() {

      return getTrainingSet().then(function(data) {

        knowledge = data;
        knowledge.keys = _.keys(data.questions);
        iaConfig.trainingSet = data.training;

        loadIA();

        return knowledge.keys.length;
      });

  }

  function getTrainingSet() {

    var defer = $q.defer();

    var local;
    var remote;

    $http({
      method: 'GET',
      url: CONSTANTS.URL_REMOTE_TRAINING_SET
    })
      .then(function successCallback(response) {
        defer.resolve(response.data);

      }, function errorCallback(response) {

        $http({
          method: 'GET',
          url: './assets/default.json'
        }).then(function successCallback(response) {
          defer.resolve(response.data);

        }, function errorCallback(response) {
          console.log('todo ha ido mal :(');
          defer.reject(response);
        });
      });

    return defer.promise;
  }

  function loadIA() {

    // Building Decision Tree
    decisionTree = new Utils.dt.DecisionTree(iaConfig);

    // Building Random Forest
    randomForest = new Utils.dt.RandomForest(iaConfig, numberOfTrees);
  }

  function predict() {

    var defer = $q.defer();

    // Testing Decision Tree and Random Forest
    $timeout(function() {

      var games = [];
        games.push(decisionTree.predict(responses));
        games =Utils.lodash.merge(games, Utils.lodash.keys(randomForest.predict(responses)))

      Utils.lodash.uniq(games);
      defer.resolve(games);

    }, CONSTANTS.AUTOSEND_SECONDS);

    return defer.promise;

  }

  function getGame(id) {

    return Utils.jmespath.search(knowledge,"training[?id=='"+id+"']");

  }

  function getQuestion() {

    var reply = {};

    var previous = Utils.lodash.keys(responses);
    var options = Utils.lodash.keys(knowledge.questions);
    var position = Utils.lodash.head(Utils.lodash.difference(options,previous));
    var candidate = knowledge.questions[position];

    if (Utils.lodash.isArray(candidate)) {
      candidate = Utils.lodash.sample(candidate);
    }

    reply = Utils.lodash.merge(reply,candidate);
    reply.attr = position;
    reply.percent = parseInt((previous.length * 100) / options.length);

    return reply;
  }

  function getResponses() {
    return _.clone(responses);
  }

  function put(key,val) {

    responses[key] = val;
    return responses.key == val;
  }

  function clear () {
    responses = null;
    responses = {};
    return _.isNull(responses);
  }

}
