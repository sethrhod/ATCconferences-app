import {
  StyleSheet,
  Text,
  View,
  SectionList,
  RefreshControl,
  SafeAreaView,
  Pressable,
} from 'react-native';
import React, { useContext, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import SessionizeContext from './context/SessionizeContext';
import SpeakerContext from './context/SpeakerContext';
import MemoizedSession from './Session.js';
import constructSectionListData from './scripts/constructSectionListData.js';
import fetchSessions from './scripts/fetchSessions.js';
import format_time from './scripts/formatTime.js';
import SessionInfo from './SessionInfo';
import FilterList from './FilterList';
import BookmarkButton from './BookmarkButton';
import SpeakerWithSessions from './SpeakerWithSessions';
import loadBookmarks from './scripts/loadBookmarks';

export default function Sessions(props) {
  const {
    customData,
    event,
    appearance,
    uUID,
    filterOptions,
    setFilterOptions,
    sessions,
    setSessions,
  } = useContext(SessionizeContext);
  const sectionListRef = React.useRef(null);

  const [refreshing, setRefreshing] = React.useState(false);
  const [sections, setSections] = React.useState([]);
  const [selectedSpeaker, setSelectedSpeaker] = React.useState(null);
  const [selectedSession, setSelectedSession] = React.useState(null);
  const [bookmarksChanged, setBookmarksChanged] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchSessions(event, customData, sessions.all_speakers, setSessions, uUID);
    setTimeout(() => {
      setRefreshing(false);
    }, 3000);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const newSections = async () => {
        const sections = constructSectionListData(sessions);
        const filteredSections = applyFilters(sections);
        setSections(filteredSections);
      };
      newSections();
    }, [filterOptions, selectedSession, sessions]),
  );

  useEffect(() => {
    createNewFilterOptions();
  }, []);

  const createNewFilterOptions = () => {
    let rooms = [];
    let times = [];
    // loops through all sessions and adds the rooms to the rooms array
    sessions.sessions.map(session => {
      if (!rooms.includes(session.room)) {
        rooms.push(session.room);
      }
    });
    // loops through all sessions and adds the times to the times array
    sessions.sessions.map(session => {
      if (!times.includes(session.startsAt)) {
        times.push(session.startsAt);
      }
    });
    let roomsObjects = [];
    let timesObjects = [];
    // loops through all rooms and creates an object for each room
    rooms.map(room => {
      roomsObjects.push({ name: room, value: false });
    });
    // loops through all times and creates an object for each time
    times.map(time => {
      let formattedTime = format_time(time);
      timesObjects.push({ name: formattedTime, value: false });
    });
    let newFilterOptions = filterOptions;
    newFilterOptions.forEach(option => {  
      if (option.name === 'Rooms') {
          // sets the options for the rooms filter
        option.options = roomsObjects;
      } else if (option.name === 'Times') {
          // sets the options for the times filter
        option.options = timesObjects;
      }
    });
    setFilterOptions(newFilterOptions);
  };

  const applyFilters = newSections => {
    let rooms = [];
    let times = [];
    filterOptions.forEach(option => {
      if (option.name === 'Rooms' || option.name === 'Times') {
        if (option.options) {
          option.options.forEach(subOption => {
            if (subOption.value) {
              if (option.name === 'Rooms') {
                rooms.push(subOption.name);
              } else if (option.name === 'Times') {
                times.push(subOption.name);
              }
            }
          });
        }
      }
    });
    if (rooms.length === 0 && times.length === 0) {
      return newSections;
    }
    let filteredSections = [];
    newSections.forEach(section => {
      let filteredData = [];
      section.data.forEach(item => {
        // if rooms and times are not empty, filter by both
        if (rooms.length > 0 && times.length > 0) {
          if (
            rooms.includes(item.room) &&
            times.includes(format_time(item.startsAt))
          ) {
            filteredData.push(item);
          }
          // if rooms is not empty, filter by rooms
        } else if (rooms.length > 0) {
          if (rooms.includes(item.room)) {
            filteredData.push(item);
          }
          // if times is not empty, filter by times
        } else if (times.length > 0) {
          if (times.includes(format_time(item.startsAt))) {
            filteredData.push(item);
          }
        }
      });
      if (filteredData.length > 0) {
        filteredSections.push({ title: section.title, data: filteredData });
      }
    });
    return filteredSections;
  };

  const headerRightSchedule = () => {
    return (
      <View style={styles.header_right_schedule}>
        <FilterList
          filterOptions={filterOptions}
          setFilterOptions={setFilterOptions}
        />
      </View>
    );
  };

  const ConditionalRender = (props) => {
    // conditional render for when there are no sessions
    if (sessions.sessions.length === 0) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.noSessionsContainer}>
            <Text
              style={[
                styles.noSessionsText,
                { color: event.colors[appearance].text },
              ]}>
              No sessions found
            </Text>
          </View>
        </SafeAreaView>
      );
    } else {
      return (
        <SafeAreaView
          style={[
            styles.container,
            { backgroundColor: event.colors[appearance].background },
          ]}>
          <SectionList
            sections={sections}
            ref={sectionListRef}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            style={styles.section_list}
            keyExtractor={(item, index) => item + index}
            renderItem={({ item, index, section }) => (
              <MemoizedSession
                session={item}
                starts={item.startsAt}
                ends={item.endsAt}
                // starts={getNewTime(item.startsAt)}
                // ends={getNewTime(item.endsAt)}
                itemIndex={index}
                sectionIndex={section.index}
                sectionListRef={sectionListRef}
                setSections={setSections}
                refreshing={refreshing}
                onRefresh={onRefresh}
                navigation={props.navigation}
                setSelectedSession={setSelectedSession}
                bookmarksChanged={bookmarksChanged}
                setBookmarksChanged={setBookmarksChanged}
              />
            )}
            renderSectionHeader={({ section: { title, index } }) => (
              <View
                style={[
                  styles.timeblock,
                  { backgroundColor: event.colors[appearance].background },
                ]}
                key={index}>
                <Text
                  style={[
                    styles.timeblock_text,
                    { color: event.colors[appearance].text },
                  ]}>
                  {title}
                </Text>
              </View>
            )}
          />
        </SafeAreaView>
      );
    }
  };

  const HeaderRight = (props) => {
    const [bookmarked, setBookmarked] = React.useState(false);

    useEffect(() => {
      const getBookmarks = async () => {
        return await loadBookmarks(event, sessions);
      };
      getBookmarks().then((bookmarksList) => {
        // find if session is bookmarked
        const bookmarked = bookmarksList.find(
          bookmark => bookmark === selectedSession.id,
        );
        if (bookmarked) {
          setBookmarked(true);
        } else {
          setBookmarked(false);
        }
      });
    }, [selectedSession]);

    return (
      <BookmarkButton
        session={selectedSession}
        bookmarked={bookmarked}
        setBookmarked={setBookmarked}
        bookmarksChanged={bookmarksChanged}
        setBookmarksChanged={setBookmarksChanged}
      />
    );
  };

  const value = {
    selectedSpeaker,
    selectedSession,
    setSelectedSession,
    setSelectedSpeaker,
  }

  const Stack = createNativeStackNavigator();

  return (
    <SpeakerContext.Provider value={value}>
      <NavigationContainer independent={true}>
        <Stack.Navigator>
          <Stack.Screen name="ConditionalRender" component={ConditionalRender} options={{
            headerTitle: "Sessions",
            headerRight: () => headerRightSchedule(),
            headerStyle: {
              backgroundColor: event.colors[appearance].background,
            },
            headerTitleStyle: {
              color: event.colors[appearance].text,
            },
            headerTintColor: event.colors[appearance].text,
            headerShadowVisible: false,
          }}
          />
          <Stack.Screen name="SessionInfo" component={SessionInfo} options={{
            headerRight: () => <HeaderRight />,
            headerTitle: "Session Info",
            headerStyle: {
              backgroundColor: event.colors[appearance].background,
            },
            headerTitleStyle: {
              color: event.colors[appearance].text,
            },
            headerTintColor: event.colors[appearance].text,
            headerShadowVisible: false,
          }} />
          <Stack.Screen
            name="SpeakerWithSessions"
            component={SpeakerWithSessions}
            options={{
              headerTitle: 'Speaker',
              headerStyle: {
                backgroundColor: event.colors[appearance].background,
              },
              headerTitleStyle: {
                color: event.colors[appearance].text,
              },
              headerTintColor: event.colors[appearance].text,
              headerShadowVisible: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SpeakerContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  timeblock_text: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  timeblock: {
    flex: 1,
    padding: 15,
    paddingLeft: 20,
  },
  session: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    margin: 10,
  },
  title: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 'bold',
  },
  times: {
    textAlign: 'center',
    fontSize: 12,
  },
  time_scroll_container: {
    borderRadius: 30,
    maxWidth: 30,
    margin: 10,
    marginLeft: 0,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    elevation: 5,
  },
  noSessionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSessionsText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section_list: {
    height: '100%',
    flex: 1,
  },
  header_right_schedule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  header_right_session_info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  left_swipe_titles: {
    marginRight: 5,
  },
});
