/*
 * Copyright (c) 2016 Boyter Online Services
 *
 * Use of this software is governed by the Fair Source License included
 * in the LICENSE.TXT file, but will be eventually open under GNU General Public License Version 3
 * see the README.md for when this clause will take effect
 *
 * Version 1.3.10
 */

/**
 * The implementation of the front end for searchcode server using Mithril.js
 */
 var ff_timesearchenabled = false;

Date.prototype.addDays = function (days) {
    var dat = new Date(this.valueOf())
    dat.setDate(dat.getDate() + days);
    return dat;
}

var HelperModel = {
    getDateSpan: function(startDate, stopDate) {
        var dateArray = new Array();
        var currentDate = startDate;
        while (currentDate <= stopDate) {
            dateArray.push( new Date (currentDate) )
            currentDate = currentDate.addDays(1);
        }
        return dateArray;
    },
    yearMonthDayToDate: function (yearMonthDay) {
        var year = yearMonthDay.substring(0, 4);
        var month = yearMonthDay.substring(5, 7) - 1; // Months are index so 0 = Jan
        var day = yearMonthDay.substring(8, 10);

        var date = new Date(year, month, day);
        return date;
    },
    yearMonthDayDelimit: function (yearMonthDay) {
        var year = yearMonthDay.substring(0, 4);
        var month = yearMonthDay.substring(4, 6);
        var day = yearMonthDay.substring(6, 8);

        return year + '/' + month + '/' + day;
    },
    humanise: function (diff) {
        var str = '';
        var values = [[' Year', 365], [' Month', 30], [' Day', 1]];

        for (var i=0;i<values.length;i++) {
            var amount = Math.floor(diff / values[i][1]);

            if (amount >= 1) {
                str += amount + values[i][0] + (amount > 1 ? 's' : '') + ' ';
                diff -= amount * values[i][1];
            }
        }
        return str;
    }
}


// Model that perfoms the search logic and does the actual search
var SearchModel = {
    searchvalue: m.prop(''),
    searchhistory: m.prop(false),
    searchresults: m.prop([]),

    // Used for knowing which filters have been currently selected
    langfilters: m.prop([]),
    repositoryfilters: m.prop([]),
    ownfilters: m.prop([]),
    yearfilters: m.prop([]),
    yearmonthfilters: m.prop([]),
    yearmonthdayfilters: m.prop([]),
    revisionfilters: m.prop([]),
    deletedfilters: m.prop([]),

    activelangfilters: m.prop([]),
    activerepositoryfilters: m.prop([]),
    activeownfilters: m.prop([]),
    activeyearfilters: m.prop([]),
    activeyearmonthfilters: m.prop([]),
    activeyearmonthdayfilters: m.prop([]),
    activerevisionfilters: m.prop([]),
    activedeletedfilters: m.prop([]),

    pages: m.prop([]),
    currentlyloading: m.prop(false),
    currentpage: m.prop(0),

    filterinstantly: m.prop(true),

    // From the response
    totalhits: m.prop(0),
    altquery: m.prop([]),
    query: m.prop(''),
    coderesults: m.prop([]),
    repofilters: m.prop([]),
    languagefilters: m.prop([]),
    ownerfilters: m.prop([]),

    repoFacetYear: m.prop([]),
    repoFacetYearMonth: m.prop([]),
    repoFacetYearMonthDay: m.prop([]),
    repoFacetRevision: m.prop([]),
    repoFacetDeleted: m.prop([]),

    chart: m.prop(undefined),

    clearfilters: function() {
        SearchModel.langfilters([]);
        SearchModel.repositoryfilters([]);
        SearchModel.ownfilters([]);
        SearchModel.yearfilters([]);
        SearchModel.yearmonthfilters([]);
        SearchModel.yearmonthdayfilters([]);
        SearchModel.revisionfilters([]);
        SearchModel.deletedfilters([]);
    },
    toggleinstant: function() {
        if (window.localStorage) {
            localStorage.setItem('toggleinstant', JSON.stringify(!SearchModel.filterinstantly()));
        }
        SearchModel.filterinstantly(!SearchModel.filterinstantly());
    },
    togglehistory: function() {
        if (window.localStorage) {
            localStorage.setItem('togglehistory', JSON.stringify(!SearchModel.searchhistory()));
        }

        SearchModel.searchhistory(!SearchModel.searchhistory());
    },
    getstringtitle: function() {
        var repos = '';
        var langs = '';
        var owns = '';
        var years = '';
        var yearmonths = '';
        var yearmonthdays = '';
        var revisions = '';
        var deleted = '';

        if (SearchModel.activedeletedfilters().length !== 0) {
            if (_.contains(SearchModel.activedeletedfilters(), 'TRUE')) {
                deleted = ' in deleted files ';
            }

            if (_.contains(SearchModel.activedeletedfilters(), 'FALSE')) {
                if (deleted.length === 0) {
                    deleted = ' in modified/added files ';
                }
                else {
                    deleted += ' and modified/added files ';
                }
            }
        }


        if (SearchModel.activerepositoryfilters().length !== 0) {
            var plural = 'repository';
            if (SearchModel.activerepositoryfilters().length >= 2) {
                plural = 'repositories';
            }

            repos = ' filtered by ' + plural + ' "' + SearchModel.activerepositoryfilters().join(', ') + '"';
        }

        if (SearchModel.activelangfilters().length !== 0) {
            var plural = 'language';
            if (SearchModel.activelangfilters().length >= 2) {
                plural = 'languages';
            }

            if (repos === '') {
                langs = ' filtered by ' + plural + ' "';
            }
            else {
                langs = ' and ' + plural + ' "';
            }
            langs = langs + SearchModel.activelangfilters().join(', ') + '"';
        }

        if (SearchModel.activeownfilters().length != 0) {
            var plural = 'owner';

            if (SearchModel.activeownfilters().length >= 2) {
                plural = 'owners';
            }

            if (repos === '' && langs === '') {
                owns = ' filtered by ' + plural + ' "';
            }
            else {
                owns = ' and ' + plural + ' "';
            }

            owns = owns + SearchModel.activeownfilters().join(', ') + '"';
        }

        if (SearchModel.activeyearfilters().length != 0) {
            var plural = 'the year';

            if (SearchModel.activeyearfilters().length >= 2) {
                plural = 'the years';
            }

            years = ' in ' + plural + ' "' + SearchModel.activeyearfilters().join(', ') + '"';
        }

        if (SearchModel.activeyearmonthfilters().length != 0) {
            var plural = 'the year/month';

            if (SearchModel.activeyearmonthfilters().length >= 2) {
                plural = 'the year/months';
            }

            if (years === '') {
                yearmonths = ' filtered by ' + plural + ' "';
            }
            else {
                yearmonths = ' and ' + plural + ' "';
            }

            yearmonths = yearmonths + _.map(SearchModel.activeyearmonthfilters(), function(e) { return e.substring(0, 4) + '/' + e.substring(4, 8); } ).join(', ') + '"';
        }

        if (SearchModel.activeyearmonthdayfilters().length != 0) {
            var plural = 'the year/month/day';

            if (SearchModel.activeyearmonthdayfilters().length >= 2) {
                plural = 'the year/month/days';
            }

            if (years === '' && yearmonths === '') {
                yearmonthdays = ' filtered by ' + plural + ' "';
            }
            else {
                yearmonthdays = ' and ' + plural + ' "';
            }

            yearmonthdays = yearmonthdays + _.map(SearchModel.activeyearmonthdayfilters(), function(e) { return e.substring(0, 4) + '/' + e.substring(4, 6) + '/' + e.substring(6, 8); } ).join(', ') + '"';
        }

        if (SearchModel.activerevisionfilters().length != 0) {
            var plural = 'revision';

            if (SearchModel.activerevisionfilters().length >= 2) {
                plural = 'revisions';
            }

            yearmonthdays = ' limited to ' + plural  + ' "' + SearchModel.activerevisionfilters().join(', ') + '"';
        }

        return '"' + SearchModel.query() + '"' + deleted + repos + langs + owns + years + yearmonths + yearmonthdays + revisions;
    },
    togglefilter: function (type, name) {
        switch(type) {
            case 'language':
                if (_.indexOf(SearchModel.langfilters(), name) === -1) {
                    SearchModel.langfilters().push(name);
                }
                else {
                    SearchModel.langfilters(_.without(SearchModel.langfilters(), name));
                }
                break;
            case 'repo':
                if (_.indexOf(SearchModel.repositoryfilters(), name) === -1) {
                    SearchModel.repositoryfilters().push(name);
                }
                else {
                    SearchModel.repositoryfilters(_.without(SearchModel.repositoryfilters(), name));
                }
                break;
            case 'owner':
                if (_.indexOf(SearchModel.ownfilters(), name) === -1) {
                    SearchModel.ownfilters().push(name);
                }
                else {
                    SearchModel.ownfilters(_.without(SearchModel.ownfilters(), name));
                }
                break;
            case 'year':
                if (_.indexOf(SearchModel.yearfilters(), name) === -1) {
                    SearchModel.yearfilters().push(name);
                }
                else {
                    SearchModel.yearfilters(_.without(SearchModel.yearfilters(), name));
                }
                break;
            case 'yearmonth':
                if (_.indexOf(SearchModel.yearmonthfilters(), name) === -1) {
                    SearchModel.yearmonthfilters().push(name);
                }
                else {
                    SearchModel.yearmonthfilters(_.without(SearchModel.yearmonthfilters(), name));
                }
                break;
            case 'yearmonthday':
                if (_.indexOf(SearchModel.yearmonthdayfilters(), name) === -1) {
                    SearchModel.yearmonthdayfilters().push(name);
                }
                else {
                    SearchModel.yearmonthdayfilters(_.without(SearchModel.yearmonthdayfilters(), name));
                }
                break;
            case 'deleted':
                if (_.indexOf(SearchModel.deletedfilters(), name) === -1) {
                    SearchModel.deletedfilters().push(name);
                }
                else {
                    SearchModel.deletedfilters(_.without(SearchModel.deletedfilters(), name));
                }
                break;
            case 'revision':
                if (_.indexOf(SearchModel.revisionfilters(), name) === -1) {
                    SearchModel.revisionfilters().push(name);
                }
                else {
                    SearchModel.revisionfilters(_.without(SearchModel.revisionfilters(), name));
                }
                break;
        }
    },
    filterexists: function (type, name) {
        switch(type) {
            case 'language':
                if (_.indexOf(SearchModel.langfilters(), name) === -1) {
                    return false;
                }
                break;
            case 'repo':
                if (_.indexOf(SearchModel.repositoryfilters(), name) === -1) {
                    return false;
                }
                break;
            case 'owner':
                if (_.indexOf(SearchModel.ownfilters(), name) === -1) {
                    return false;
                }
                break;
            case 'year':
                if (_.indexOf(SearchModel.yearfilters(), name) === -1) {
                    return false;
                }
                break;
            case 'yearmonth':
                if (_.indexOf(SearchModel.yearmonthfilters(), name) === -1) {
                    return false;
                }
                break;
            case 'yearmonthday':
                if (_.indexOf(SearchModel.yearmonthdayfilters(), name) === -1) {
                    return false;
                }
                break;
            case 'deleted':
                if (_.indexOf(SearchModel.deletedfilters(), name) === -1) {
                    return false;
                }
                break;
            case 'revision':
                if (_.indexOf(SearchModel.revisionfilters(), name) === -1) {
                    return false;
                }
                break;
            case 'deleted':
                if (_.indexOf(SearchModel.deletedfilters(), name) === -1) {
                    return false;
                }
                break;
        }

        return true;
    },
    getlangfilters: function() {
        var lang = '';

        if (SearchModel.langfilters().length != 0) {
            lang = '&lan=' + _.map(SearchModel.langfilters(), function(e) { return encodeURIComponent(e); } ).join('&lan=');
        }

        return lang;
    },
    getrepofilters: function() {
        var repo = '';

        if (SearchModel.repositoryfilters().length != 0) {
            repo = '&repo=' + _.map(SearchModel.repositoryfilters(), function(e) { return encodeURIComponent(e); } ).join('&repo=');
        }

        return repo;
    },
    getownfilters: function() {
        var own = '';

        if (SearchModel.ownfilters().length != 0) {
            own = '&own=' + _.map(SearchModel.ownfilters(), function(e) { return encodeURIComponent(e); } ).join('&own=');
        }

        return own;
    },
    getyearfilters: function() {
        var year = '';

        if (SearchModel.yearfilters().length != 0) {
            year = '&year=' + _.map(SearchModel.yearfilters(), function(e) { return encodeURIComponent(e); } ).join('&year=');
        }

        return year;
    },
    getyearmonthfilters: function() {
        var ym = '';

        if (SearchModel.yearmonthfilters().length != 0) {
            ym = '&ym=' + _.map(SearchModel.yearmonthfilters(), function(e) { return encodeURIComponent(e); } ).join('&ym=');
        }

        return ym;
    },
    getyearmonthdayfilters: function() {
        var ymd = '';

        if (SearchModel.yearmonthdayfilters().length != 0) {
            ymd = '&ymd=' + _.map(SearchModel.yearmonthdayfilters(), function(e) { return encodeURIComponent(e); } ).join('&ymd=');
        }

        return ymd;
    },
    getrevisionfilters: function() {
        var rev = '';

        if (SearchModel.revisionfilters().length != 0) {
            rev = '&rev=' + _.map(SearchModel.revisionfilters(), function(e) { return encodeURIComponent(e); } ).join('&rev=');
        }

        return rev;
    },
    getdeletedfilters: function() {
        var del = '';

        if (SearchModel.deletedfilters().length != 0) {
            del = '&del=' + _.map(SearchModel.deletedfilters(), function(e) { return encodeURIComponent(e); } ).join('&del=');
        }

        return del;
    },
    setstatechange: function(pagequery, isstatechange) {
        // set the state
        if (isstatechange === undefined) {
            history.pushState({
                searchvalue: SearchModel.searchvalue(),
                langfilters: SearchModel.activelangfilters(),
                repofilters: SearchModel.activerepositoryfilters(),
                ownfilters: SearchModel.activeownfilters(),
                currentpage: SearchModel.currentpage()
            }, 'search', '?q=' + 
                        encodeURIComponent(SearchModel.searchvalue()) + 
                        SearchModel.getlangfilters() + 
                        SearchModel.getrepofilters() + 
                        SearchModel.getownfilters() + 
                        SearchModel.getyearfilters() + 
                        SearchModel.getyearmonthfilters() + 
                        SearchModel.getyearmonthdayfilters() + 
                        SearchModel.getrevisionfilters() + 
                        SearchModel.getdeletedfilters() + 
                        pagequery);
        }
    },
    search: function(page, isstatechange) {
        if (SearchModel.currentlyloading()) {
            return;
        }

        SearchModel.currentlyloading(true);
        m.redraw();

        // If we have filters append them on
        var lang = SearchModel.getlangfilters();
        var repo = SearchModel.getrepofilters();
        var own = SearchModel.getownfilters();
        var year = SearchModel.getyearfilters();
        var ym = SearchModel.getyearmonthfilters();
        var ymd = SearchModel.getyearmonthdayfilters();
        var rev = SearchModel.getrevisionfilters();
        var del = SearchModel.getdeletedfilters();

        var searchpage = 0;
        var pagequery = ''
        if(page !== undefined) {
            searchpage = page
            SearchModel.currentpage(page);
            if (searchpage !== 0) {
                pagequery = '&p=' + searchpage;
            }
        }

        // Stringify and parse to create a copy not a reference
        SearchModel.activelangfilters(JSON.parse(JSON.stringify(SearchModel.langfilters())));
        SearchModel.activerepositoryfilters(JSON.parse(JSON.stringify(SearchModel.repositoryfilters())));
        SearchModel.activeownfilters(JSON.parse(JSON.stringify(SearchModel.ownfilters())));
        SearchModel.activeyearfilters(JSON.parse(JSON.stringify(SearchModel.yearfilters())));
        SearchModel.activeyearmonthfilters(JSON.parse(JSON.stringify(SearchModel.yearmonthfilters())));
        SearchModel.activeyearmonthdayfilters(JSON.parse(JSON.stringify(SearchModel.yearmonthdayfilters())));
        SearchModel.activerevisionfilters(JSON.parse(JSON.stringify(SearchModel.revisionfilters())));
        SearchModel.activedeletedfilters(JSON.parse(JSON.stringify(SearchModel.deletedfilters())));

        SearchModel.setstatechange(pagequery, isstatechange);

        var queryurl = '/api/codesearch/?q=' + encodeURIComponent(SearchModel.searchvalue()) + lang + repo + own + year + ym + ymd + rev + del + '&p=' + searchpage;
        if (SearchModel.searchhistory() === true ) { 
            queryurl = '/api/timecodesearch/?q=' + encodeURIComponent(SearchModel.searchvalue()) + lang + repo + own + year + ym + ymd + rev + del + '&p=' + searchpage;
        }

        m.request( { method: 'GET', url: queryurl } ).then( function(e) {

            SearchModel.totalhits(e.totalHits);
            SearchModel.altquery(e.altQuery);
            SearchModel.query(e.query);
            SearchModel.pages(e.pages);
            SearchModel.currentpage(e.page);

            SearchModel.coderesults(e.codeResultList);
            SearchModel.repofilters(e.repoFacetResults);
            SearchModel.languagefilters(e.languageFacetResults);
            SearchModel.ownerfilters(e.repoOwnerResults);

            // History fields
            SearchModel.repoFacetYear(e.repoFacetYear);
            SearchModel.repoFacetYearMonth(e.repoFacetYearMonth);
            SearchModel.repoFacetYearMonthDay(e.repoFacetYearMonthDay);
            SearchModel.repoFacetRevision(e.repoFacetRevision);
            SearchModel.repoFacetDeleted(e.repoFacetDeleted);

            SearchModel.currentlyloading(false);
        }).then( function(e) {
            SearchModel.renderchart();
        });
    },
    chartlimit: m.prop(365),
    renderchart: function() {
        if (SearchModel.chart() !== undefined) {
            SearchModel.chart().destroy();
        }

        if (SearchModel.repoFacetYearMonthDay().length == 0) {
            return;
        }

        var ctx = document.getElementById('timeChart');


        var facets = {};
        var labels = [];
        _.each(SearchModel.repoFacetYearMonthDay(), function(e) { 
            var fac = HelperModel.yearMonthDayDelimit(e.yearMonthDay);
            facets[fac] = e.count; 
            labels.push(fac);
        });

        labels.sort();

        if (labels.length != 0) {
            var startDate = HelperModel.yearMonthDayToDate(labels[0]);
            var endDate = HelperModel.yearMonthDayToDate(labels[labels.length - 1]);
            //endDate = new Date();

            labels = _.map(HelperModel.getDateSpan(startDate, endDate), function(e) {
                var year = e.getFullYear();
                var month = e.getMonth() + 1;
                month = month < 10 ? '0' + month : month;
                var day = e.getDate() < 10 ? '0' + e.getDate() : e.getDate();

                return year + '/' + month + '/' + day;
            });

            labels = labels.splice(labels.length - SearchModel.chartlimit(), labels.length);
        }

        var data = {
            labels: labels,
            datasets: [{
                label: SearchModel.query(),
                fill: true,
                lineTension: 0.1,
                backgroundColor: 'rgba(75,192,192,0.4)',
                borderColor: '#428bca', // Line colour
                borderCapStyle: 'butt',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: 'rgba(75,192,192,1)',
                pointBackgroundColor: '#fff',
                pointBorderWidth: 5,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: 'rgba(75,192,192,1)',
                pointHoverBorderColor: 'rgba(220,220,220,1)',
                pointHoverBorderWidth: 1,
                pointRadius: 1,
                pointHitRadius: 10,
                data: _.map(labels, function(e) { return facets[e]; } ),
                spanGaps: true
            }]
        };

        var myLineChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                legend: {
                    display: false
                 },
                 responsiveAnimationDuration: 0,
                 scales: {
                    xAxes: [{
                        ticks: {
                            //autoSkip: false,
                            maxRotation: 30,
                            minRotation: 30,
                            callback: function(value, index, values) {
                                if (values.length < 30) {
                                    return value;
                                }

                                if (parseInt(index) % 3 === 0 || index == values.length - 1) {
                                    return '' + value;
                                }
                                
                                return '';
                            }
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            callback: function(value, index, values) {
                                if (('' + value).indexOf('.') !== -1) {
                                    return '';
                                }
                                return '' + parseInt(value);
                            }
                        }
                    }],
                },
                animation: {
                    duration: 0
                },

            }
        });

        SearchModel.chart(myLineChart);
    }
};

// Main component that does everything
var SearchComponent = {
    view: function(ctrl) {
        return m("div", [
                m.component(SearchOptionsComponent),
                m.component(SearchChartComponent),
                m.component(SearchCountComponent, { 
                    totalhits: SearchModel.totalhits(), 
                    query: SearchModel.query(),
                    repofilters: SearchModel.activerepositoryfilters(),
                    languagefilters: SearchModel.activelangfilters(),
                    ownerfilters: SearchModel.activeownfilters()
                }),
                
                m.component(SearchLoadingComponent, {
                    currentlyloading: SearchModel.currentlyloading()
                }),
                m('div.row', [
                    m('div.col-md-3.search-filters-container.search-filters', [
                        m.component(SearchNextPreviousComponent, {
                            currentpage: SearchModel.currentpage(), 
                            pages: SearchModel.pages(),
                            setpage: SearchModel.setpage,
                            search: SearchModel.search,
                            totalhits: SearchModel.totalhits(),
                        }),
                        m.component(SearchAlternateFilterComponent, {
                            query: SearchModel.query(),
                            altquery: SearchModel.altquery()
                        }),
                        m.component(SearchRepositoriesFilterComponent, {
                            repofilters: SearchModel.repofilters(),
                            search: SearchModel.search,
                            filterinstantly: SearchModel.filterinstantly
                        }),
                        m.component(SearchLanguagesFilterComponent, {
                            languagefilters: SearchModel.languagefilters(),
                            search: SearchModel.search,
                            filterinstantly: SearchModel.filterinstantly
                        }),
                        m.component(SearchOwnersFilterComponent),
                        m.component(SearchYearFilterComponent),
                        m.component(SearchYearMonthFilterComponent),
                        m.component(SearchYearMonthDayFilterComponent),
                        m.component(SearchRevisionComponent),
                        m.component(SearchDeletedComponent),
                        m.component(SearchButtonFilterComponent, {
                            totalhits: SearchModel.totalhits(),
                            clearfilters: SearchModel.clearfilters,
                            search: SearchModel.search,
                            languagefilters: SearchModel.langfilters(),
                            repofilters: SearchModel.repositoryfilters(),
                            ownfilters: SearchModel.ownfilters(),
                            filterinstantly: SearchModel.filterinstantly
                        }),
                        m.component(FilterOptionsComponent, {
                            filterinstantly: SearchModel.filterinstantly
                        })
                    ]),
                    m('div.col-md-9.search-results', [
                        m.component(SearchNoResultsComponent, {
                            totalhits: SearchModel.totalhits(),
                            query: SearchModel.query(),
                            altquery: SearchModel.altquery(),
                        }),
                        m.component(SearchResultsComponent, { 
                            coderesults: SearchModel.coderesults()
                        })
                    ]),
                    m.component(SearchPagesComponent, { 
                        currentpage: SearchModel.currentpage(),
                        pages: SearchModel.pages(),
                        search: SearchModel.search
                    })
                ])
            ]);
    }
}


var SearchNoResultsComponent = {
    controller: function() {
        return {
            doaltquery: function(altquery) {
                SearchModel.searchvalue(altquery);
                SearchModel.search();
            }
        }
    },
    view: function(ctrl, args) {
        if (args.totalhits !== 0) {
            return m('div');
        }

        var suggestion = m('h5', 'Try searching with fewer and more general keywords or if you have filters remove them.');

        if (args.altquery.length !== 0) {

            var message = 'Try one of the following searches instead';
            if (args.altquery.length === 1) {
                message = 'Try the following search instead';
            }
            
            suggestion = m('div', [
                m('h5', message),
                m('ul', { style: { 'list-style-type': 'none' } },
                    _.map(args.altquery, function (e) { 
                        return m('li', m('a', { href: '', onclick: function () { ctrl.doaltquery(e); } }, e)); 
                    } )
                )
            ]);
        }

        return m('div', [
            m('h4', 'No results found for ',  m('i.grey', args.query)),
            suggestion
        ]);
    }
}

var SearchNextPreviousComponent = {
    controller: function() {
    },
    view: function(ctrl, args) {

        if (args.pages === undefined || args.totalhits === undefined || args.totalhits === 0) {
            return m('div');
        }

        var previouspageoptions = '';
        var nextpageoptions = '';

        if (SearchModel.currentpage() == 0) {
            previouspageoptions = 'disabled';
        }

        if ((SearchModel.currentpage() + 1) >= args.pages.length) {
            nextpageoptions = 'disabled';
        }

        return m('div', [
            m('h5', 'Page ' +  (SearchModel.currentpage() + 1) + ' of ' + (args.pages.length == 0 ? 1 : args.pages.length)),
            m('div.center',
                m('input.btn.btn-xs.btn-success.filter-button', { 
                    type: 'submit', 
                    disabled: previouspageoptions,
                    onclick: function() { args.search((SearchModel.currentpage() - 1)); }, 
                    value: '◀ Previous' }
                ),
                m('span', m.trust('&nbsp;')),
                m('input.btn.btn-xs.btn-success.filter-button', { 
                    type: 'submit', 
                    disabled: nextpageoptions,
                    onclick: function() { args.search((SearchModel.currentpage() + 1)); }, 
                    value: 'Next ▶' }
                )
            )
        ]);
    }
}

var SearchLoadingComponent = {
    view: function() {
        var style = {};

        if (SearchModel.currentlyloading() === false) {
            style = { style: { display: 'none' } };
        }

        return m('div.search-loading', style, [
            m('img', { src: '/img/loading.gif' }),
            m('h5', 'Loading...')
        ]);
    }
}

var SearchPagesComponent = {
    controller: function() {
    },
    view: function(ctrl, args) {
        return m('div.search-pagination', 
            m('ul.pagination', [
                _.map(args.pages, function (res) {
                    return m('li', { class: res == SearchModel.currentpage() ? 'active' : '' },
                        m('a', { onclick: function() { 
                            args.search(res); 
                            window.scrollTo(0, 0);
                        } }, res + 1)
                    )
                })
            ])
        );
    }
}

var SearchButtonFilterComponent = {
    controller: function() {
    },
    view: function(ctrl, args) {
        if (args.totalhits === undefined) {
            return m('div');
        }

        if (args.totalhits === 0 && (args.languagefilters.length + args.repofilters.length + args.ownfilters.length === 0)) {
            return m('div');
        }

        if (args.totalhits === 0 && (args.languagefilters.length + args.repofilters.length + args.ownfilters.length !== 0)) {
            return m('div', [
                m('h5', 'Filter Results'),
                m('input.btn.btn-xs.btn-success.filter-button', { 
                    type: 'submit', 
                    onclick: function() { args.clearfilters(); args.search(); }, 
                    value: 'Remove' })
            ]);
        }

        return m('div', [
            m('h5', 'Filter Results'),
            m('div.center', 
                m('input.btn.btn-xs.btn-success.filter-button', { 
                    type: 'submit', 
                    onclick: function() { args.clearfilters(); args.search(); }, 
                    value: 'Remove' }
                ),
                m('span', m.trust('&nbsp;')),
                m('input.btn.btn-xs.btn-success.filter-button', { 
                    type: 'submit',
                    disabled: SearchModel.filterinstantly(),
                    onclick: function() { args.search() }, 
                    value: 'Apply' }
                )
            )
        ]);
    }
}

var FilterOptionsComponent = {
    controller: function() {
        return {
            togglehistory: function() {
                SearchModel.togglehistory();
                SearchModel.search();
            },
            toggleinstant: function() {
                SearchModel.toggleinstant();
            }
        }
    },
    view: function(ctrl, args) {
        var instantparams = { type: 'checkbox', onclick: ctrl.toggleinstant };
        var historyparams = { type: 'checkbox', onclick: ctrl.togglehistory };
        
        if (SearchModel.filterinstantly()) {
            instantparams.checked = 'checked'
        }

        if (SearchModel.searchhistory()) {
            historyparams.checked = 'checked'
        }

        return m('div', 
            m('h5', 'Filter Options'),
            m('div', [
                m('div.checkbox', 
                    m('label', [
                        m('input', instantparams),
                        m('span', 'Apply Filters Instantly')
                    ])
                ),
                ff_timesearchenabled === false ? m('span') : m('div.checkbox', 
                    m('label', [
                        m('input', historyparams),
                        m('span', 'Search Across History')
                    ])
                )
            ])
        );
    }
}

var SearchRepositoriesFilterComponent = {
    controller: function() {
        
        var showall = false;
        var trimlength = 5;
        var filtervalue = '';

        return {
            trimrepo: function (languagefilters) {
                var toreturn = languagefilters;

                if (filtervalue.length === 0 && !showall) {
                    toreturn = _.first(toreturn, trimlength);
                }

                if (filtervalue.length !== 0) {
                    toreturn = _.filter(toreturn, function (e) { 
                        return e.repoName.toLowerCase().indexOf(filtervalue) !== -1; 
                    } );
                }

                return toreturn;
            },
            toggleshowall: function() {
                showall = !showall;
            },
            showall: function () {
                return showall;
            },
            trimlength: function () {
                return trimlength;
            },
            clickenvent: function(repo) {
                SearchModel.togglefilter('repo', repo);
            },
            filtervalue: function(value) {
                filtervalue = value;
            },
            hasfilter: function() {
                return filtervalue.length !== 0;
            },
            getfiltervalue: function() {
                return filtervalue;
            }
        }
    },
    view: function(ctrl, args) {
        var showmoreless = m('div');

        if (args.repofilters === undefined || args.repofilters.length == 0) {
            return showmoreless;
        }

        if (!ctrl.hasfilter() && ctrl.trimlength() < args.repofilters.length) {
            var morecount = args.repofilters.length - ctrl.trimlength();

            showmoreless =  m('a.green', { onclick: ctrl.toggleshowall }, morecount + ' more repositories ', m('span.glyphicon.glyphicon-chevron-down'))

            if (ctrl.showall()) {
                showmoreless = m('a.green', { onclick: ctrl.toggleshowall }, 'less repositories ', m('span.glyphicon.glyphicon-chevron-up'))
            }
        }

        return m('div', [
            m('h5', 'Repositories'),
            m('input.repo-filter', {
                onkeyup: m.withAttr('value', ctrl.filtervalue),
                placeholder: 'Filter Repositories',
                value: ctrl.getfiltervalue()
            }),
            _.map(ctrl.trimrepo(args.repofilters), function(res, ind) {
                return m.component(FilterCheckboxComponent, {
                    onclick: function() { 
                        ctrl.clickenvent(res.repoName);
                        if (SearchModel.filterinstantly()) {
                            args.search();
                        }
                    },
                    value: res.repoName,
                    count: res.count,
                    checked: SearchModel.filterexists('repo', res.repoName)
                });
            }),
            showmoreless
        ]);
    }
}

var SearchLanguagesFilterComponent = {
    controller: function() {

        var showall = false;
        var trimlength = 5;
        var filtervalue = '';
        
        return {
            trimlanguage: function (languagefilters) {
                var toreturn = languagefilters;

                if (filtervalue.length === 0 && !showall) {
                    toreturn = _.first(toreturn, trimlength);
                }

                if (filtervalue.length !== 0) {
                    toreturn = _.filter(toreturn, function (e) { 
                        return e.languageName.toLowerCase().indexOf(filtervalue) !== -1; 
                    });
                }

                return toreturn;
            },
            toggleshowall: function() {
                showall = !showall;
            },
            showall: function () {
                return showall;
            },
            trimlength: function () {
                return trimlength;
            },
            clickenvent: function(language) {
                SearchModel.togglefilter('language', language);
            },
            filtervalue: function(value) {
                filtervalue = value;
            },
            hasfilter: function() {
                return filtervalue.length !== 0;
            },
            getfiltervalue: function() {
                return filtervalue;
            }
        }
    },
    view: function(ctrl, args) {

        var showmoreless = m('div');

        if (args.languagefilters === undefined || args.languagefilters.length == 0) {
            return showmoreless;
        }

        if (!ctrl.hasfilter() && ctrl.trimlength() < args.languagefilters.length) {
            var morecount = args.languagefilters.length - ctrl.trimlength();

            showmoreless =  m('a.green', { onclick: ctrl.toggleshowall }, morecount + ' more languages ', m('span.glyphicon.glyphicon-chevron-down'))

            if (ctrl.showall()) {
                showmoreless = m('a.green', { onclick: ctrl.toggleshowall }, 'less languages ', m('span.glyphicon.glyphicon-chevron-up'))
            }
        }

        return m('div', [
            m('h5', 'Languages'),
            m('input.repo-filter', {
                onkeyup: m.withAttr('value', ctrl.filtervalue),
                placeholder: 'Filter Languages',
                value: ctrl.getfiltervalue()
            }),
            _.map(ctrl.trimlanguage(args.languagefilters), function(res, ind) {
                return m.component(FilterCheckboxComponent, {
                    onclick: function() { 
                        ctrl.clickenvent(res.languageName); 
                        if (SearchModel.filterinstantly()) {
                            args.search();
                        }
                    },
                    value: res.languageName,
                    count: res.count,
                    checked: SearchModel.filterexists('language', res.languageName)
                });
            }),
            showmoreless
        ]);
    }
}

var SearchOwnersFilterComponent = {
    controller: function() {

        var showall = false;
        var trimlength = 5;
        var filtervalue = '';
        
        return {
            trimlanguage: function (ownerfilters) {
                var toreturn = ownerfilters;

                if (filtervalue.length === 0 && !showall) {
                    toreturn = _.first(toreturn, trimlength);
                }

                if (filtervalue.length !== 0) {
                    toreturn = _.filter(toreturn, function (e) { 
                        return e.owner.toLowerCase().indexOf(filtervalue) !== -1; 
                    });
                }

                return toreturn;
            },
            toggleshowall: function() {
                showall = !showall;
            },
            showall: function () {
                return showall;
            },
            trimlength: function () {
                return trimlength;
            },
            clickenvent: function(owner) {
                SearchModel.togglefilter('owner', owner);
                if (SearchModel.filterinstantly()) {
                    SearchModel.search();
                }
            },
            filtervalue: function(value) {
                filtervalue = value;
            },
            hasfilter: function() {
                return filtervalue.length !== 0;
            },
            getfiltervalue: function() {
                return filtervalue;
            }
        }
    },
    view: function(ctrl) {

        var showmoreless = m('div');

        if (SearchModel.ownerfilters() === undefined || SearchModel.ownerfilters().length == 0) {
            return showmoreless;
        }

        if (!ctrl.hasfilter() && ctrl.trimlength() < SearchModel.ownerfilters().length) {
            var morecount = SearchModel.ownerfilters().length - ctrl.trimlength();

            showmoreless =  m('a.green', { onclick: ctrl.toggleshowall }, morecount + ' more owners ', m('span.glyphicon.glyphicon-chevron-down'))

            if (ctrl.showall()) {
                showmoreless = m('a.green', { onclick: ctrl.toggleshowall }, 'less owners ', m('span.glyphicon.glyphicon-chevron-up'))
            }
        }

        return m('div', [
            m('h5', 'Owners'),
            m('input.repo-filter', {
                onkeyup: m.withAttr('value', ctrl.filtervalue),
                placeholder: 'Filter Owners',
                value: ctrl.getfiltervalue()
            }),
            _.map(ctrl.trimlanguage(SearchModel.ownerfilters()), function(res, ind) {
                return m.component(FilterCheckboxComponent, {
                    onclick: function() { 
                        ctrl.clickenvent(res.owner); 
                    },
                    value: res.owner,
                    count: res.count,
                    checked: SearchModel.filterexists('owner', res.owner)
                });
            }),
            showmoreless
        ]);
    }
}

var SearchYearFilterComponent = {
    controller: function() {

        var showall = false;
        var trimlength = 5;
        var filtervalue = '';
        
        return {
            trimlanguage: function (ownerfilters) {
                var toreturn = ownerfilters;

                if (filtervalue.length === 0 && !showall) {
                    toreturn = _.first(toreturn, trimlength);
                }

                if (filtervalue.length !== 0) {
                    toreturn = _.filter(toreturn, function (e) { 
                        return e.year.toLowerCase().indexOf(filtervalue) !== -1; 
                    });
                }

                return toreturn;
            },
            toggleshowall: function() {
                showall = !showall;
            },
            showall: function () {
                return showall;
            },
            trimlength: function () {
                return trimlength;
            },
            clickenvent: function(owner) {
                SearchModel.togglefilter('year', owner);
            },
            filtervalue: function(value) {
                filtervalue = value;
            },
            hasfilter: function() {
                return filtervalue.length !== 0;
            },
            getfiltervalue: function() {
                return filtervalue;
            }
        }
    },
    view: function(ctrl) {

        var showmoreless = m('div');

        if (SearchModel.repoFacetYear() === undefined || SearchModel.repoFacetYear().length == 0) {
            return showmoreless;
        }

        if (!ctrl.hasfilter() && ctrl.trimlength() < SearchModel.repoFacetYear.length) {
            var morecount = SearchModel.yearfilters().length - ctrl.trimlength();

            showmoreless =  m('a.green', { onclick: ctrl.toggleshowall }, morecount + ' more dates ', m('span.glyphicon.glyphicon-chevron-down'))

            if (ctrl.showall()) {
                showmoreless = m('a.green', { onclick: ctrl.toggleshowall }, 'less dates ', m('span.glyphicon.glyphicon-chevron-up'))
            }
        }

        return m('div', [
            m('h5', 'Year'),
            m('input.repo-filter', {
                onkeyup: m.withAttr('value', ctrl.filtervalue),
                placeholder: 'Filter Dates',
                value: ctrl.getfiltervalue()
            }),
            _.map(ctrl.trimlanguage(SearchModel.repoFacetYear()), function(res, ind) {
                return m.component(FilterCheckboxComponent, {
                    onclick: function() { 
                        ctrl.clickenvent(res.year); 
                        if (SearchModel.filterinstantly()) {
                            SearchModel.search();
                        }
                    },
                    value: res.year,
                    count: res.count,
                    checked: SearchModel.filterexists('year', res.year)
                });
            }),
            showmoreless
        ]);
    }
}

var SearchYearMonthFilterComponent = {
    controller: function() {

        var showall = false;
        var trimlength = 5;
        var filtervalue = '';
        
        return {
            trimlanguage: function (ownerfilters) {
                var toreturn = ownerfilters;

                if (filtervalue.length === 0 && !showall) {
                    toreturn = _.first(toreturn, trimlength);
                }

                if (filtervalue.length !== 0) {
                    toreturn = _.filter(toreturn, function (e) { 
                        return e.yearMonth.toLowerCase().indexOf(filtervalue) !== -1; 
                    });
                }

                return toreturn;
            },
            toggleshowall: function() {
                showall = !showall;
            },
            showall: function () {
                return showall;
            },
            trimlength: function () {
                return trimlength;
            },
            clickenvent: function(owner) {
                SearchModel.togglefilter('yearmonth', owner);
            },
            filtervalue: function(value) {
                filtervalue = value;
            },
            hasfilter: function() {
                return filtervalue.length !== 0;
            },
            getfiltervalue: function() {
                return filtervalue;
            }
        }
    },
    view: function(ctrl) {

        var showmoreless = m('div');

        if (SearchModel.repoFacetYearMonth() === undefined || SearchModel.repoFacetYearMonth().length == 0) {
            return showmoreless;
        }

        if (!ctrl.hasfilter() && ctrl.trimlength() < SearchModel.repoFacetYearMonth().length) {
            var morecount = SearchModel.repoFacetYearMonth().length - ctrl.trimlength();

            showmoreless =  m('a.green', { onclick: ctrl.toggleshowall }, morecount + ' more dates ', m('span.glyphicon.glyphicon-chevron-down'))

            if (ctrl.showall()) {
                showmoreless = m('a.green', { onclick: ctrl.toggleshowall }, 'less dates ', m('span.glyphicon.glyphicon-chevron-up'))
            }
        }

        return m('div', [
            m('h5', 'Year/Month'),
            m('input.repo-filter', {
                onkeyup: m.withAttr('value', ctrl.filtervalue),
                placeholder: 'Filter Dates',
                value: ctrl.getfiltervalue()
            }),
            _.map(ctrl.trimlanguage(SearchModel.repoFacetYearMonth()), function(res, ind) {
                return m.component(FilterCheckboxComponent, {
                    onclick: function() { 
                        ctrl.clickenvent(res.yearMonth); 
                        if (SearchModel.filterinstantly()) {
                            SearchModel.search();
                        }
                    },
                    value: res.yearMonth,
                    count: res.count,
                    checked: SearchModel.filterexists('yearmonth', res.yearMonth)
                });
            }),
            showmoreless
        ]);
    }
}

var SearchYearMonthDayFilterComponent = {
    controller: function() {

        var showall = false;
        var trimlength = 5;
        var filtervalue = '';
        
        return {
            trimlanguage: function (ownerfilters) {
                var toreturn = ownerfilters;

                if (filtervalue.length === 0 && !showall) {
                    toreturn = _.first(toreturn, trimlength);
                }

                if (filtervalue.length !== 0) {
                    toreturn = _.filter(toreturn, function (e) { 
                        return e.yearMonthDay.toLowerCase().indexOf(filtervalue) !== -1; 
                    });
                }

                return toreturn;
            },
            toggleshowall: function() {
                showall = !showall;
            },
            showall: function () {
                return showall;
            },
            trimlength: function () {
                return trimlength;
            },
            clickenvent: function(owner) {
                SearchModel.togglefilter('yearmonthday', owner);
            },
            filtervalue: function(value) {
                filtervalue = value;
            },
            hasfilter: function() {
                return filtervalue.length !== 0;
            },
            getfiltervalue: function() {
                return filtervalue;
            }
        }
    },
    view: function(ctrl, args) {

        var showmoreless = m('div');

        if (SearchModel.repoFacetYearMonthDay() === undefined || SearchModel.repoFacetYearMonthDay().length == 0) {
            return showmoreless;
        }

        if (!ctrl.hasfilter() && ctrl.trimlength() < SearchModel.repoFacetYearMonthDay().length) {
            var morecount = SearchModel.repoFacetYearMonthDay().length - ctrl.trimlength();

            showmoreless =  m('a.green', { onclick: ctrl.toggleshowall }, morecount + ' more dates ', m('span.glyphicon.glyphicon-chevron-down'))

            if (ctrl.showall()) {
                showmoreless = m('a.green', { onclick: ctrl.toggleshowall }, 'less dates ', m('span.glyphicon.glyphicon-chevron-up'))
            }
        }

        return m('div', [
            m('h5', 'Year/Month/Day'),
            m('input.repo-filter', {
                onkeyup: m.withAttr('value', ctrl.filtervalue),
                placeholder: 'Filter Dates',
                value: ctrl.getfiltervalue()
            }),
            _.map(ctrl.trimlanguage(SearchModel.repoFacetYearMonthDay()), function(res, ind) {
                return m.component(FilterCheckboxComponent, {
                    onclick: function() { 
                        ctrl.clickenvent(res.yearMonthDay); 
                        if (SearchModel.filterinstantly()) {
                            SearchModel.search();
                        }
                    },
                    value: res.yearMonthDay,
                    count: res.count,
                    checked: SearchModel.filterexists('yearmonthday', res.yearMonthDay)
                });
            }),
            showmoreless
        ]);
    }
}

var SearchRevisionComponent = {
    controller: function() {

        var showall = false;
        var trimlength = 5;
        var filtervalue = '';
        
        return {
            trimlanguage: function (ownerfilters) {
                var toreturn = ownerfilters;

                if (filtervalue.length === 0 && !showall) {
                    toreturn = _.first(toreturn, trimlength);
                }

                if (filtervalue.length !== 0) {
                    toreturn = _.filter(toreturn, function (e) { 
                        return e.revision.toLowerCase().indexOf(filtervalue) !== -1; 
                    });
                }

                return toreturn;
            },
            toggleshowall: function() {
                showall = !showall;
            },
            showall: function () {
                return showall;
            },
            trimlength: function () {
                return trimlength;
            },
            clickenvent: function(owner) {
                SearchModel.togglefilter('revision', owner);
            },
            filtervalue: function(value) {
                filtervalue = value;
            },
            hasfilter: function() {
                return filtervalue.length !== 0;
            },
            getfiltervalue: function() {
                return filtervalue;
            }
        }
    },
    view: function(ctrl, args) {

        var showmoreless = m('div');

        if (SearchModel.repoFacetRevision() === undefined || SearchModel.repoFacetRevision().length == 0) {
            return showmoreless;
        }

        if (!ctrl.hasfilter() && ctrl.trimlength() < SearchModel.repoFacetRevision().length) {
            var morecount = SearchModel.repoFacetRevision().length - ctrl.trimlength();

            showmoreless =  m('a.green', { onclick: ctrl.toggleshowall }, morecount + ' more revisions ', m('span.glyphicon.glyphicon-chevron-down'))

            if (ctrl.showall()) {
                showmoreless = m('a.green', { onclick: ctrl.toggleshowall }, 'less revisions ', m('span.glyphicon.glyphicon-chevron-up'))
            }
        }

        return m('div', [
            m('h5', 'Revision'),
            m('input.repo-filter', {
                onkeyup: m.withAttr('value', ctrl.filtervalue),
                placeholder: 'Filter Revisions',
                value: ctrl.getfiltervalue()
            }),
            _.map(ctrl.trimlanguage(SearchModel.repoFacetRevision()), function(res, ind) {
                return m.component(FilterCheckboxComponent, {
                    onclick: function() { 
                        ctrl.clickenvent(res.revision); 
                        if (SearchModel.filterinstantly()) {
                            SearchModel.search();
                        }
                    },
                    value: res.revision.substring(0, 12),
                    count: res.count,
                    checked: SearchModel.filterexists('revision', res.revision)
                });
            }),
            showmoreless
        ]);
    }
}

var SearchDeletedComponent = {
    controller: function() {
        return {
            clickenvent: function(owner) {
                SearchModel.togglefilter('deleted', owner);
            }
        }
    },
    view: function(ctrl, args) {
        if (SearchModel.repoFacetDeleted() === undefined || SearchModel.repoFacetDeleted().length == 0) {
            return m('div');
        }

        return m('div', [
            m('h5', 'Added/Removed'),
            _.map(SearchModel.repoFacetDeleted(), function(res, ind) {
                return m.component(FilterCheckboxComponent, {
                    onclick: function() { 
                        ctrl.clickenvent(res.deleted); 
                        if (SearchModel.filterinstantly()) {
                            SearchModel.search();
                        }
                    },
                    value: res.deleted === 'FALSE' ? 'Added/Modified' : 'Deleted',
                    count: res.count,
                    checked: SearchModel.filterexists('deleted', res.deleted)
                });
            })
        ]);
    }
}



var FilterCheckboxComponent = {
    view: function(ctrl, args) {
        var inputparams = { type: 'checkbox', onclick: args.onclick };
        
        if (args.checked) {
            inputparams.checked = 'checked'
        }

        return m('div.checkbox', 
            m('label', [
                m('input', inputparams),
                m('span', args.value),
                m('span', { class: 'badge pull-right' }, args.count)
            ])
        )
    }
}

var SearchOptionsComponent = {
    controller: function() {
        return {
            dosearch: function() {
                SearchModel.search();
            }
        }
    },
    view: function(ctrl, args) {


        return m('div', { class: 'search-options'}, 
            m('form', { onsubmit: function(event) { ctrl.dosearch(); return false; } },
                m('div.form-inline', [
                    m('div.form-group', 
                        m('input.form-control', {
                            autocapitalize: 'off', 
                            autocorrect: 'off',
                            autocomplete: 'off',
                            spellcheck: 'false',
                            size:'50', 
                            placeholder: 'Search Expression',
                            onkeyup: m.withAttr('value', SearchModel.searchvalue),
                            value: SearchModel.searchvalue(),
                            type: 'search',
                            id: 'searchbox'})
                    ),
                    m('input.btn.btn-success', { value: 'search', type: 'submit', onclick: ctrl.dosearch.bind(this) })
                ])
            )
        );
    }
}

var SearchCountComponent = {
    controller: function() {
        return {}
    },
    view: function(ctrl, args) {
        if(args.totalhits === undefined) {
            return m('div');
        }


        var stringTitle = SearchModel.getstringtitle();

        document.title = 'Search for ' + stringTitle;

        return m('div.row.search-count', [
            m('b', SearchModel.totalhits() + ' results: '),
            m('span.grey', stringTitle)
        ]);
    }
}

var SearchChartComponent = {
    controller: function() {
        var display = true;
        var steps = [
            365 * 20,
            365 * 10,
            365 * 5,
            365 * 2,
            365,
            6 * 30,
            3 * 30,
            1 * 30,
            15,
            7,
            5,
            4,
            3,
            2,
            1
        ];

        return {
            shoulddisplay: function() {
                if (display === false) {
                    return false;
                }

                if (SearchModel.searchhistory() === false) {
                    return false;
                }

                return true;
            },
            zoomout: function() {
                var index = _.findIndex(steps, function(e) { return e == SearchModel.chartlimit(); });
                if (index == 0) {
                    return;
                } 
                index -= 1;

                SearchModel.chartlimit(steps[index]);
                SearchModel.renderchart();
            },
            zoomin: function() {
                var index = _.findIndex(steps, function(e) { return e == SearchModel.chartlimit(); });
                if (index == steps.length) {
                    return;
                } 
                index += 1;

                SearchModel.chartlimit(steps[index]);
                SearchModel.renderchart();
            }
        }
    },
    view: function(ctrl) {
        if (ctrl.shoulddisplay() === false || ff_timesearchenabled === false) {
            return m('div');
        }

        // TODO need to have logic to display the hide show if there is data to show it
        return m('div.row.search-chart', [
            m('canvas', {id: 'timeChart', width: '500', height: '45'})
        ]);  
    }
}

var SearchAlternateFilterComponent = {
    controller: function() {
        // helper functions would go here
        return {
            doaltquery: function(altquery) {
                SearchModel.searchvalue(altquery);
                SearchModel.search();
            }
        }
    },
    view: function(ctrl, args) {
        if(args.altquery === undefined || args.altquery.length === 0) {
            return m('div');
        }

        return m('div', [
            m('h5', 'Alternate Searches'),
            m('div', [
                _.map(args.altquery, function(res) {
                    return m('div.checkbox', 
                        m('label', [
                            m('a', { onclick: function () { ctrl.doaltquery(res)} }, res)
                        ])
                    )
                })
            ])
        ]);
    }
}

var SearchResultsComponent = {
    controller: function() {
        return {
            gethref: function(result) {
                return '/file/' + result.codeId + '/' + result.codePath;
            },
            getrepositoryhref: function(result) {
                return '/repository/overview/' + result.repoName + '/';
            },
            gethreflineno: function(result, lineNumber) {
                return '/file/' + result.codeId + '/' + result.codePath + '#' + lineNumber;
            },
            getatag: function(result) {
                return result.fileName;
            },
            getsmallvalue: function(result){
                var fixedCodePath = '/' + result.codePath.split('/').slice(1,100000).join('/');
                return ' | ' + fixedCodePath +' | ' + result.codeLines + ' lines | ' + result.languageName;
            }
        }
    },
    view: function(ctrl, args) {
        return m('div', [
                _.map(args.coderesults, function(res) {
                    return m('div.code-result', [
                        m('div', 
                            m('h5', [
                                m('div', [
                                    m('a', { href: ctrl.gethref(res) }, ctrl.getatag(res)),
                                    m('span', ' in '),
                                    m('a', { href: ctrl.getrepositoryhref(res) }, res.repoName),
                                    m('small', ctrl.getsmallvalue(res))  
                                ]),
                                
                            ])
                        ),
                        m('ol.code-result', [
                            _.map(res.matchingResults, function(line) {
                                return m('li', { value: line.lineNumber }, 
                                    m('a', { 'href':  ctrl.gethreflineno(res, line.lineNumber) },
                                        m('pre', m.trust(line.line))
                                    )
                                );
                            })
                        ]),
                        m('hr', {class: 'spacer'})
                    ]);
                })
        ]);
    }
}


//Initialize the application
m.mount(document.getElementsByClassName('container')[0], m.component(SearchComponent));

// For when someone hits the back button in the browser
window.onpopstate = function(event) {
    if (event && event.state) {
        SearchModel.searchvalue(event.state.searchvalue);
        SearchModel.currentpage(event.state.currentpage);
        SearchModel.activelangfilters(event.state.langfilters);
        SearchModel.langfilters(event.state.langfilters);
        SearchModel.activerepositoryfilters(event.state.repofilters);
        SearchModel.repositoryfilters(event.state.repofilters);
        SearchModel.ownfilters(event.state.ownfilters);
        SearchModel.activeownfilters(event.state.ownfilters);

        SearchModel.search(event.state.currentpage, true);
        popstate = true;
    }
};

// For direct links to search results 
if (typeof preload !== 'undefined') {
    SearchModel.searchvalue(preload.query);
    SearchModel.currentpage(preload.page);

    SearchModel.activelangfilters(preload.languageFacets);
    SearchModel.langfilters(preload.languageFacets);

    SearchModel.activerepositoryfilters(preload.repositoryFacets);
    SearchModel.repositoryfilters(preload.repositoryFacets);

    SearchModel.ownfilters(preload.ownerFacets);
    SearchModel.activeownfilters(preload.ownerFacets);

    SearchModel.search(preload.page, true);
}


if (window.localStorage) {
    var tmp = JSON.parse(localStorage.getItem('toggleinstant'));
    tmp !== null ? SearchModel.filterinstantly(tmp) : SearchModel.filterinstantly(true);
    if (ff_timesearchenabled === true) {
        tmp = JSON.parse(localStorage.getItem('togglehistory'));
        tmp !== null ? SearchModel.searchhistory(tmp) : SearchModel.searchhistory(true);
    }
}
else {
    SearchModel.filterinstantly(true);
    SearchModel.searchhistory(false);
}
