app = angular.module("chartApp", ["firebase", "googlechart","toastr"]);

app.factory("pollService", ["$firebaseArray",
    function($firebaseArray) {
        // create a reference to the database location where we will store our data
        var ref = firebase.database().ref('polls');
        // this uses AngularFire to create the synchronized array
        return $firebaseArray(ref);
    }
]);

app.factory("chartService", [
    function() {
        // object decleration
        var obj = {};
        obj.data = {};
        obj.type = "PieChart";
        obj.options = {
            'title': '',
            'category': '',
            'is3D': true,
            'pieHole': 0,
            'chartArea': {
                'left': '10%',
                'top': '10%',
                'width': '100%',
                'height': '100%'
            }
        };
        // types of charts available
        obj.chartTypes = [
            { name: "Pie Chart", type: "PieChart" },
            { name: "Column Chart", type: "ColumnChart" },
            { name: "Bar Chart", type: "BarChart" },
            { name: "Line Chart", type: "LineChart" },
            { name: "Area Chart", type: "AreaChart" }
        ];
        // chart columns/rows
        obj.data["cols"] = [{id:1,label:"Option:",type:"string"},{id:2,label: "Votes:",type:"number"}];
        obj.data["rows"] = [];
        obj.updateDonut = function(size) {
            obj.options['pieHole'] = size;
        }
        obj.increment = function(row, voter) {
            if (row['c'][2] === undefined) {row['c'][2] = { votes: [] };}
            ind = row['c'][2].votes.findIndex(function(el) {return el.uid === voter.uid;});

            if (ind !== -1) {
                toastr.warning("You already voted here!");
                return false;
            }
            row['c'][1].v++;
            row['c'][2].votes.push(voter);
            return true;
        }
        obj.decrement = function(row, voter) {
            if (row['c'][2] === undefined) {
                toastr.warning("You haven't voted here!");
                return false;
            }
            ind = row['c'][2].votes.findIndex(function(el) {return el.uid === voter.uid;});
            if (ind === -1) {
                toastr.warning("You haven't voted here!");
                return false;
            }
            row['c'][2].votes.splice(ind, 1);
            row['c'][1].v = Math.max(0, row['c'][1].v - 1);
            return true;
        }
        obj.trash = function(row) {
            ind = obj.data['rows'].indexOf(row);
            obj.data['rows'].splice(ind, 1);
        }
        obj.clearChart = function() {
            obj.data["rows"] = [];
        }
        obj.setData = function(data) {
            obj.data = data.data;
            obj.options["title"] = data.title;
            obj.options["category"] = data.category;
        }
        obj.addColumn = function(label) {
            if(obj.data['rows'] === undefined) {obj.data['rows'] = [];}
            obj.data["rows"].push({c:[{v:label},{v:0},{votes:[]}]});
        }
        return obj;
    }
]);

app.factory("AuthService", [
    "$firebaseAuth",
    function($firebaseAuth) {return $firebaseAuth();}
]);

app.controller("HomeCtrl", [
    "$scope",
    'toastr',
    "AuthService",
    function($scope,toastr, AuthService) {
        $scope.Auth = null;
        $scope.createUser = function() {
            if (!$scope.userName || !$scope.password) { return; }
            $scope.message = null;
            $scope.error = null;
            // Create a new user
            AuthService.$createUserWithEmailAndPassword($scope.userName + "@nomail.com", $scope.password)
                .then(function(firebaseUser) {
                    toastr.success('Welcome to SoloLearn Polls: '+$scope.userName, 'User Created!');
                    // $scope.message = "User created with uid: " + firebaseUser.uid;
                    $scope.signIn();
                }).catch(function(error) {
                    toastr.error(error);
                    $scope.error = error;
                });
        };

        $scope.signIn = function() {
            if (!$scope.userName || !$scope.password) { return; }
            AuthService.$signInWithEmailAndPassword($scope.userName + "@nomail.com", $scope.password, $scope.password).then(function(firebaseUser) {
                toastr.success('Welcome back to SoloLearn Polls: '+$scope.userName, 'Successful Login!');
                $scope.message = "User logged with uid: " + firebaseUser.uid;
                $scope.Auth = firebaseUser;
                $scope.pageManager.page = 2;
            }).catch(function(error) {
                toastr.error(error);
            });
        };
        $scope.signOut = function() {
            if (AuthService) {
                $scope.message = "User logged off with uid: " + AuthService.uid;
                AuthService.$signOut();
                $scope.Auth = null;
            }
        }
        $scope.deleteUser = function() {
            $scope.message = null;
            $scope.error = null;
            // Delete the currently signed-in user
            AuthService.$deleteUser().then(function() {
                $scope.message = "User deleted";
            }).catch(function(error) {
                $scope.error = error;
            });
        };
    }
]);

app.controller("PollCtrl", [
    '$scope',
    'toastr',
    '$location',
    '$anchorScroll',
    '$timeout',
    'AuthService',
    'pollService',
    'chartService',
    function($scope, toastr, $location, $anchorScroll, $timeout, AuthService, pollService, chartService) {

        $scope.Auth = AuthService.$getAuth();
        $scope.pollService = pollService;
        $scope.myChart = chartService;
        $scope.chartTypes = chartService.chartTypes;
        $scope.primitives = {};
        $scope.loadedPoll = null;
        $scope.categories = [
            {id:1,name:"General"},
            {id:2,name:"Programming"},
            {id:3,name:"SoloLearn"},
            {id:4,name:"Science"},
            {id:5,name:"Sports"},
            {id:6,name:"Entertainment"},
            {id:7,name:"Food"}
        ];

        
        $scope.permission = function() {
            return ($scope.loadedPoll && $scope.Auth['uid'] === $scope.loadedPoll.owner.uid) || $scope.primitives.pollWizard;
        }

        $scope.randVal = function(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        }

        $scope.addRandomData = function() {
            $scope.myChart.addColumn("RANDOM", $scope.randVal(10, 100));
        }

        $scope.jumpToLocation = function(key) {
            $location.hash(key);
            $timeout(function(){$anchorScroll();},500);
        }

        $scope.addOption = function() {
            if ($scope.primitives.dataOption === undefined || $scope.primitives.dataOption === "") { return; }
            toastr.warning("Added option "+$scope.primitives.dataOption+" to Poll: "+$scope.myChart.options.title, "Don't forget to Save Changes (if this is not a new Poll)!!!");
$scope.myChart.addColumn($scope.primitives.dataOption);
        }

        $scope.pollWizardShow = function() {
            $scope.clearChart();
            $scope.primitives.pollWizard = true;
        }

        $scope.clearChart = function() {
            $scope.loadedPoll = null;
            $scope.myChart = chartService;
            $scope.myChart.clearChart();
            $scope.myChart.options['title'] = undefined;
            $scope.myChart.options['category'] = $scope.categories[0];
            $scope.primitives.dataOption = undefined;
        }

        $scope.updateDonut = function() {
            $scope.myChart.updateDonut($scope.primitives.holeSize * 0.1);
        }
        $scope.increment = function(row) {
            if ($scope.Auth === null) { return; }
            voter = {
                uid: $scope.Auth['uid'],
                name: $scope.Auth['email']
            }
            if ($scope.myChart.increment(row, voter)) {
                toastr.success("Voted for "+row['c'][0].v,"Poll: "+$scope.myChart.options.title);
                $scope.saveChanges(false);
            }
        }
        $scope.decrement = function(row) {
            voter = {
                uid: $scope.Auth['uid'],
                name: $scope.Auth['email']
            }
            if ($scope.myChart.decrement(row, voter)) {
                toastr.warning("Removed Vote for "+row['c'][0].v,"Poll: "+$scope.myChart.options.title);
                $scope.saveChanges(false);
            }
        }
        $scope.trash = function(row) {
            if(!confirm("Remove Option: "+row['c'][0].v+"?")){ return; }
            toastr.warning("Removed Option: "+row['c'][0].v,"Don't forget to Save Changes!!!");
            $scope.myChart.trash(row);
        }

        $scope.addComment = function(){
            if($scope.primitives.commentBody === undefined || $scope.primitives.commentBody.length === 0){
                toastr.error("Please Enter Comment!");
                return;
            }
            
           $scope.loadedPoll.comments=$scope.loadedPoll.comments || [];
            
            
           comment={
              owner: {
                    uid: $scope.Auth['uid'],
                    name: $scope.Auth['email']
                },
                body:$scope.primitives.commentBody,
                createTime: firebase.database.ServerValue.TIMESTAMP
           }
            $scope.loadedPoll.comments.push(comment);
            $scope.saveChanges(false);
            $scope.primitives.commentBody="";
        }
        
        $scope.trashComment = function(comment){
            if (!confirm("Delete Comment?")){return;}
            ind = $scope.loadedPoll.comments.indexOf(comment);
            $scope.loadedPoll.comments.splice(ind, 1);
            $scope.saveChanges(false);
        }

        $scope.loadCategory = function(){
            ind = 0;
            if($scope.loadedPoll && $scope.loadedPoll.category){
                ind = $scope.categories.findIndex(function(el){
                    return el.id === $scope.loadedPoll.category.id;
                });
            }
            $scope.myChart.options['category'] = $scope.categories[ind];
        }
        
        $scope.loadPoll = function(poll) {

            $scope.primitives.pollWizard = false;
            $scope.primitives.allowUsersOptions = poll.allowUsersOptions || false;
            poll = angular.copy(poll);
            $scope.myChart.setData(poll);
            $scope.loadedPoll = poll;
            $scope.loadCategory();
            $scope.jumpToLocation('anchorChart');
        }

        $scope.createPoll = function() {

            if (!$scope.myChart.options['title']) {
                return;
            }

            newPoll = {
                owner: {
                    uid: $scope.Auth['uid'],
                    name: $scope.Auth['email']
                },
                title: $scope.myChart.options['title'],
                category: $scope.myChart.options['category'],
                data: $scope.myChart.data,
                allowUsersOptions: $scope.primitives.allowUsersOptions,
                createTime: firebase.database.ServerValue.TIMESTAMP
            };

            if (newPoll.data['rows'].length<2) {
                toastr.warning("Please create at least 2 options!");
                return;
            }

            $scope.pollService.$add(newPoll).then(function(ref) {
                toastr.success(newPoll.title,"Created Poll Successfully!");
                $scope.clearChart();
                //$scope.loadPoll(newPoll);
            });
            $scope.primitives.pollWizard = false;
        }
 
        $scope.saveChanges = function(showToast) {
            if ($scope.loadedPoll === null && !$scope.primitives.pollWizard) {
                toastr.error("No poll loaded!");
                return;
            }
            ind = $scope.pollService.findIndex(function(el) {return el.$id === $scope.loadedPoll.$id;});

            if(ind===-1 || !$scope.myChart.options['title']){return;}

            $scope.pollService[ind].data =$scope.loadedPoll.data;
           $scope.pollService[ind].comments=$scope.loadedPoll.comments || [];
            $scope.pollService[ind].allowUsersOptions = $scope.primitives.allowUsersOptions;
            $scope.pollService[ind].title = $scope.myChart.options['title'];
            $scope.pollService[ind].category = $scope.myChart.options['category'];
            $scope.loadedPoll['title'] = $scope.myChart.options['title'];
            $scope.loadedPoll['category'] = $scope.myChart.options['category'];

            if ($scope.pollService[ind].data['rows'].length<2) {
                toastr.warning("Please create at least 2 options!");
                return;
            }

            $scope.pollService.$save(ind).then(function(ref) {
                if(showToast){toastr.info($scope.myChart.options.title,"Changes Saved!");}
              //toastr.info(JSON.stringify($scope.loadedPoll.comments,null,2));
              $scope.loadedPoll.comments=$scope.pollService[ind].comments || [];
               $scope.myChart.setData($scope.loadedPoll);
            });
        }

        $scope.deletePoll = function() {
            ind = $scope.pollService.findIndex(function(el) {
                return el.$id === $scope.loadedPoll.$id;
            });
            if (ind === -1) { return; }
            if (!confirm("Delete Poll?")){return;}
            $scope.pollService.$remove(ind).then(function(ref) {
            toastr.error($scope.myChart.options.title,"Deleted Poll Successfully!");
                $scope.clearChart();
            });
        }

        $scope.totalPolls = function(polls,categoryId) {
            count = 0;
            polls.forEach(function(poll){
                count += (poll.category.id===categoryId)? 1:0;
            });
            return count;
        }

        $scope.userVotedOption = function(row) {
            return (row['c'][2] === undefined || $scope.Auth['uid'] === undefined) ? false : row['c'][2]['votes'].findIndex(function(el) {

                return el['uid'] === $scope.Auth['uid'];
            }) !== -1;
        }

        $scope.userVotedPoll = function(poll) {
            voted = false;
            if (poll.data['rows'] === undefined || $scope.Auth['uid'] === undefined) {return false;}
            poll.data['rows'].forEach(function(row){
                if ($scope.userVotedOption(row)){
                    voted = true;
                }
            });
            return voted;
        }
    }
]);

Number.prototype.pad = function(n, str) {
    return Array(n - String(this).length + 1).join(str || '0') + this;
}

app.filter("timeToDate", function() {
    return function timeToDate(time, sep) {
        // converts time from integer to HH:MM:ss - DD/MM/YYYY format
        if (!time) { return ""; }
        sep = sep || " - ";
        var date = new Date(time);
        var dateString = (date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2) + sep + date.getDate() + "/" + (date.getMonth() + 1) + "/" + (date.getYear() + 1900));
        return dateString;
    }
});

app.filter('totalVotes', function() {
    return function(poll) {
        count = 0;
        poll.data['rows'].forEach(function(row){
            count += row['c'][1].v;
        });
        return count;
    }
});

app.filter('totalVoters', function() {
    return function(poll) {
        uids = [];
        poll.data['rows'].forEach(function(row){
            votes=((row['c'][2]===undefined)? []:row['c'][2]['votes']);
            votes.forEach(function(vote){
                if(uids.indexOf(vote.uid) === -1){
                    uids.push(vote.uid);
                }
            });
        });
        // return (new Set(uids)).size;
        return uids.length;
    }
});

app.filter('orderObjectByVotes', function($filter) {
    return function(items, reverse) {
        var filtered = [];
        angular.forEach(items, function(item) {
            filtered.push(item);
        });
        filtered.sort(function(a, b) {
            return ($filter('totalVotes')(a) > $filter('totalVotes')(b) ? 1 : -1);
        });
        if (reverse) filtered.reverse();
        return filtered;
    };
});

app.filter('orderObjectBy', function() {
    return function(items, reverse) {
        var filtered = [];
        angular.forEach(items, function(item) {
            filtered.push(item);
        });
        filtered.sort(function(a, b) {
            return ((a['c'][1].v>b['c'][1].v)? 1:-1);
        });
        if (reverse) filtered.reverse();
        return filtered;
    };
});
