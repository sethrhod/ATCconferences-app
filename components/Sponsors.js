import React, {useContext} from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  FlatList,
  Image,
  Text,
  TouchableHighlight,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import SessionizeContext from './context/SessionizeContext';
import SpeakerContext from './context/SpeakerContext';
import SessionInfo from './SessionInfo';
import SpeakerWithSessions from './SpeakerWithSessions';
import Session from './Session';
import BookmarkButton from './BookmarkButton';
import fetchWithTimeout from './scripts/fetchWithTimeout';
import TimeoutErrorMessage from './TimeoutErrorMessage';
import loadBookmarks from './scripts/loadBookmarks';

export default function Sponsors() {
  const {event, appearance, sessions} = useContext(SessionizeContext);

  const [data, setData] = React.useState(null);
  const [isLoading, setLoading] = React.useState(true);
  const [timeoutError, setTimeoutError] = React.useState(false);
  const [bookmarksChanged, setBookmarksChanged] = React.useState(false);
  const [selectedSession, setSelectedSession] = React.useState(null);
  const [selectedSpeaker, setSelectedSpeaker] = React.useState(null);

  useFocusEffect(
  React.useCallback(() => {
    const fetchSponsors = async () => {
      try {
        const response = await fetchWithTimeout(event.sponsorsAPI, {
          timeout: 8000,
        });
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.log(error.name === 'AbortError');
        setTimeoutError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSponsors();
  }, [bookmarksChanged]),
  );

  const sponsoredSession = props => {
    var sponsored_sessions = [];
    props.sponsors.sessions.forEach(session => {
      // if session id matches sessions id, push
      sessions.sessions.forEach(s => {
        if (s.id == session.id) {
          sponsored_sessions.push(s);
        }
      });
    });
    return sponsored_sessions;
  };

  const SponsorsSession = props => {
    let sponsored_sessions = sponsoredSession(props);
    return (
      <View>
        {sponsored_sessions.map((session, index) => (
          <Session
            session={session}
            key={index}
            starts={session.startsAt}
            ends={session.endsAt}
            navigation={props.navigation}
            setSelectedSession={setSelectedSession}
            bookmarksChanged={bookmarksChanged}
          />
        ))}
      </View>
    );
  };

  const SubItem = props => (
    <View style={[styles.sub_item, {backgroundColor: event.colors[appearance].foreground}]}>
      <TouchableHighlight onPress={() => Linking.openURL(props.sponsors.url)}>
        <View style={styles.logo_container}>
          <Image style={styles.logo} source={{uri: props.sponsors.uri}} />
        </View>
      </TouchableHighlight>
      <SponsorsSession sponsors={props.sponsors} navigation={props.navigation} />
    </View>
  );

  const sponsor_level_color = sponsor_level => {
    switch (sponsor_level) {
      case 'Gold':
        return '#FFD700';
      case 'Silver':
        return '#b9c0cb';
      case 'Swag':
        return event.colors[appearance].text;
      default:
        return '#c5cbe2';
    }
  };

  const Item = props => (
    <View style={styles.sponsor_level_container}>
      <Text
        style={[
          styles.sponsor_level,
          {
            color: sponsor_level_color(props.item.sponsor_level),
          },
        ]}>
        {props.item.sponsor_level}
      </Text>
      <FlatList
        data={props.item.sponsors}
        renderItem={({item}) => <SubItem sponsors={item} navigation={props.navigation} />}
        contentContainerStyle={{alignItems: 'stretch'}}
        style={{width: '100%'}}
      />
    </View>
  );

  const SponsorsList = props => {
    return (
      <SafeAreaView style={[styles.item_container, { backgroundColor: event.colors[appearance].background }]}>
        {isLoading &&
          <View style={[styles.loading_container, {backgroundColor: event.colors[appearance].background}]}>
            <Text style={[styles.loading, {color: event.colors[appearance].text}]}>Loading...</Text>
          </View>
        }
        <FlatList
          data={data}
          renderItem={({ item }) => <Item item={item} navigation={props.navigation} />}
          contentContainerStyle={{ alignItems: 'stretch' }}
          style={{ width: '100%' }}
        />
      </SafeAreaView>
    );
  };

  const headerRight = () => {
    const [bookmarked, setBookmarked] = React.useState(false);

    React.useEffect(() => {
      const getBookmarks = async () => {
        return await loadBookmarks(event, sessions);
      };
      getBookmarks()
        .then(bookmarksList => {
          // find if session is bookmarked
          const bookmarked = bookmarksList.find(
            bookmark => bookmark === selectedSession.id,
          );
          if (bookmarked) {
            setBookmarked(true);
          } else {
            setBookmarked(false);
          }
        })
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

  if (timeoutError) {
    return (
      <View style={[styles.container, {backgroundColor: event.colors[appearance].background}]}>
        <TimeoutErrorMessage />
      </View>
    )
  }

  const Stack = createNativeStackNavigator();

  const value = {
    selectedSpeaker,
    selectedSession,
    setSelectedSession,
    setSelectedSpeaker,
  }

  return (
    <SpeakerContext.Provider value={value}>
      <NavigationContainer independent={true}>
        <Stack.Navigator>
          <Stack.Screen
            name="Sponsors"
            component={SponsorsList}
            options={{
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
          <Stack.Screen
            name="SessionInfo"
            component={SessionInfo}
            options={{
              headerRight: () => headerRight(),
              headerTitle: 'Session Info',
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
    justifyContent: 'center',
  },
  item_container: {
    flex: 1,
    width: '100%',
  },
  sponsor_level_container: {
    alignItems: 'center',
    padding: 5,
  },
  sponsor_level: {
    width: '100%',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowRadius: Platform.OS === 'ios' ? 3 : 5,
    textShadowOffset: {width: -1, height: 1},
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontStyle: 'italic',
  },
  logo_container: {
    padding: 5,
    marginVertical: 8,
  },
  logo: {
    width: '100%',
    height: 100,
    resizeMode: 'contain',
  },
  sub_item: {
    borderRadius: 5,
    padding: 10,
    margin: 10,
    shadowColor: '#000',
    elevation: 5,
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: {width: 1, height: 1},
  },
  loading_container: {
    flex: 1,
    marginTop: Dimensions.get('window').height / 3,
    marginBottom: Dimensions.get('window').height / 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    fontSize: 25,
  },
});
